/* Yazh Studios — shared site animations
   - Hero / page-banner content animates in immediately on load (staggered).
   - Everything else below the fold reveals as it scrolls into view.
   - The hero/page-banner headline gets a "cut" wipe reveal instead of a plain fade,
     to nod at the edit/film theme.
   - Respects prefers-reduced-motion (handled mainly in CSS; this JS still runs
     but the CSS neutralizes the transform/clip-path when reduced motion is set).
*/
(function () {
  function markReveal(el, delayMs, wipe) {
    if (!el) return;
    el.classList.add(wipe ? 'reveal-wipe' : 'reveal');
    if (delayMs) el.style.setProperty('--reveal-delay', delayMs + 'ms');
  }

  /* ---- Stat counters (100+, 5+, 4, 3 ...) count up from 0 ---- */
  function animateCount(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';

    var raw = el.textContent.trim();
    var match = raw.match(/^(\d+)(.*)$/);
    if (!match) return;

    var target = parseInt(match[1], 10);
    var suffix = match[2] || '';
    var duration = 1300;
    var start = null;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = target + suffix;
      return;
    }

    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target + suffix;
      }
    }
    requestAnimationFrame(step);
  }

  function animateCounters(scope) {
    (scope || document).querySelectorAll('.stat-row .num').forEach(animateCount);
  }

  /* ---- Per-line headline reveal: each line masks + lifts in with a slight tilt ---- */
  function splitHeadline(h1) {
    if (!h1 || h1.dataset.split) return null;
    h1.dataset.split = '1';
    var parts = h1.innerHTML.split(/<br\s*\/?>/i);
    h1.innerHTML = '';
    var lines = [];
    parts.forEach(function (part, i) {
      if (!part.trim()) return;
      var mask = document.createElement('span');
      mask.className = 'line-mask';
      var inner = document.createElement('span');
      inner.className = 'line-inner';
      inner.innerHTML = part;
      inner.style.setProperty('--line-delay', (i * 130) + 'ms');
      mask.appendChild(inner);
      h1.appendChild(mask);
      lines.push(inner);
    });
    return lines;
  }

  /* ---- Pointer-following tilt for cards, echoing a floating/depth feel ---- */
  function attachTilt(el, maxTilt, scale) {
    maxTilt = maxTilt || 7;
    scale = scale || 1.02;
    el.addEventListener('mouseenter', function () { el.style.transition = 'none'; });
    el.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      var rx = (0.5 - py) * maxTilt;
      var ry = (px - 0.5) * maxTilt;
      el.style.transform = 'perspective(800px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) scale(' + scale + ')';
    });
    el.addEventListener('mouseleave', function () {
      el.style.transition = 'transform .5s cubic-bezier(.16,.8,.24,1)';
      el.style.transform = '';
    });
  }

  function initTilt() {
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var noHover = window.matchMedia && window.matchMedia('(hover: none)').matches;
    if (reduced || noHover) return;
    document.querySelectorAll('.hero-visual').forEach(function (el) { attachTilt(el, 10, 1.02); });
    document.querySelectorAll('.service-card, .team-card, .testi-card').forEach(function (el) { attachTilt(el, 6, 1.015); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTilt();

    /* ---- Immediate hero / page-banner entrance ---- */
    var heroH1 = document.querySelector('.hero h1, .page-banner h1');
    var headlineLines = splitHeadline(heroH1);

    var heroFade = document.querySelectorAll(
      '.hero .eyebrow, .hero p, .hero-actions, .stat-row, .hero-visual, ' +
      '.page-banner .breadcrumb, .page-banner .eyebrow, .page-banner p'
    );
    heroFade.forEach(function (el, i) { markReveal(el, 90 + i * 100, false); });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (headlineLines) {
          headlineLines.forEach(function (line) { line.classList.add('is-visible'); });
        }
        heroFade.forEach(function (el) { el.classList.add('is-visible'); });
        animateCounters(document);
      });
    });

    /* ---- In case a .stat-row ever sits below the fold on some page ---- */
    if ('IntersectionObserver' in window) {
      var statIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounters(entry.target);
            statIo.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      document.querySelectorAll('.stat-row').forEach(function (el) { statIo.observe(el); });
    }

    /* ---- Scroll-triggered reveals for everything else ---- */
    var groupSelectors = [
      '.services-grid', '.why-grid', '.process-grid', '.team-grid',
      '.testi-grid', '.portfolio-grid', '.client-chips', '.contact-info-list'
    ];
    document.querySelectorAll(groupSelectors.join(',')).forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        markReveal(child, Math.min(i * 90, 450), false);
      });
    });

    var soloSelectors = [
      '.section-head', '.story-card', '.story-body > p',
      '.contact-panel', '.video-frame', '.map-frame'
    ];
    document.querySelectorAll(soloSelectors.join(',')).forEach(function (el) {
      markReveal(el, 0, false);
    });

    var toObserve = document.querySelectorAll('.reveal:not(.is-visible), .reveal-wipe:not(.is-visible)');

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

      toObserve.forEach(function (el) { io.observe(el); });
    } else {
      toObserve.forEach(function (el) { el.classList.add('is-visible'); });
    }
  });
})();
