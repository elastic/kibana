/*!
 * <elastic-ambient-bg> — ambient dot-blob background for Kibana login / boot splash.
 * Plain JS custom element. No dependencies, no build step.
 * Ported 1:1 from the "Blob Pattern Background" prototype (canvas renderer unchanged).
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || !window.customElements) return;
  if (customElements.get('elastic-ambient-bg')) return;

  // Defaults = tuned prototype values.
  var DEFAULTS = {
    speed: 1.1,       // time multiplier
    sway: 0.18,       // complementary grow/shrink amount (fraction of radius)
    wobble: 0.23,     // edge ripple amplitude (fraction of radius)
    feather: 230,     // px — soft falloff width at blob edge
    pitch: 10,        // px — grid spacing between dot centres
    'dot-size': 2,    // px — max dot diameter
    opacity: 0.24,    // max dot alpha (deepest inside a blob)
    color: '#4D4D4F'  // dot fill (hard-coded, light theme)
  };
  // Blob anchors: r = radius factor, x/y = anchor as fraction of viewport.
  var PRESET = { tl: { r: 0.62, x: 0, y: 0 }, br: { r: 0.58, x: 1, y: 1 } };
  var LEVELS = 10; // alpha buckets (one fill() per bucket)

  var CSS =
    ':host{display:block;position:fixed;inset:0;pointer-events:none;z-index:0;background:transparent;contain:strict;}' +
    'canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}';

  function ElasticAmbientBg() {
    return Reflect.construct(HTMLElement, [], ElasticAmbientBg);
  }
  ElasticAmbientBg.prototype = Object.create(HTMLElement.prototype);
  ElasticAmbientBg.prototype.constructor = ElasticAmbientBg;
  Object.setPrototypeOf(ElasticAmbientBg, HTMLElement);

  Object.defineProperty(ElasticAmbientBg, 'observedAttributes', {
    get: function () { return Object.keys(DEFAULTS); }
  });

  var P = ElasticAmbientBg.prototype;

  P.connectedCallback = function () {
    if (!this._root) {
      this._root = this.attachShadow({ mode: 'open' });
      var style = document.createElement('style');
      style.textContent = CSS;
      this._canvas = document.createElement('canvas');
      this._root.appendChild(style);
      this._root.appendChild(this._canvas);
    }
    this.setAttribute('aria-hidden', 'true');
    this._time = 0;
    this._last = performance.now();

    var self = this;
    this._mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    this._reduce = this._mq.matches;
    this._onMQ = function (e) { self._reduce = e.matches; self._restart(); };
    if (this._mq.addEventListener) this._mq.addEventListener('change', this._onMQ);
    else this._mq.addListener(this._onMQ);

    this._ro = new ResizeObserver(function () { if (self._reduce) self._draw(0); });
    this._ro.observe(this);

    this._restart();
  };

  P.disconnectedCallback = function () {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    if (this._ro) this._ro.disconnect();
    if (this._mq) {
      if (this._mq.removeEventListener) this._mq.removeEventListener('change', this._onMQ);
      else this._mq.removeListener(this._onMQ);
    }
  };

  P.attributeChangedCallback = function () {
    if (this._reduce && this._canvas) this._draw(0);
  };

  P._num = function (name) {
    var v = parseFloat(this.getAttribute(name));
    return isFinite(v) ? v : DEFAULTS[name];
  };

  P._restart = function () {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    if (this._reduce) { this._draw(0); return; } // static frame
    var self = this;
    this._last = performance.now();
    var loop = function (now) {
      var dt = Math.min(now - self._last, 64) / 1000;
      self._last = now;
      self._draw(dt);
      self._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  };

  P._draw = function (dt) {
    var cv = this._canvas; if (!cv) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    }
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    this._time += dt * this._num('speed');
    var t = this._time;
    var cur = PRESET;

    var S = Math.min(W, H), diag = Math.hypot(W, H);
    var base = Math.max(S, diag * 0.45);
    // Complementary breathing: one blob reaches toward centre while the other retreats.
    var sway = this._num('sway') * Math.sin(t * 0.32);
    var blobs = [
      { cx: cur.tl.x * W + Math.sin(t * 0.23) * 18, cy: cur.tl.y * H + Math.cos(t * 0.19) * 14, R: cur.tl.r * base * (1 + sway), ph: 0 },
      { cx: cur.br.x * W + Math.cos(t * 0.21) * 18, cy: cur.br.y * H + Math.sin(t * 0.17) * 14, R: cur.br.r * base * (1 - sway), ph: 2.1 }
    ];
    var amp = this._num('wobble');
    function edge(b, th) {
      return b.R * (1
        + amp * Math.sin(2 * th + t * 0.55 + b.ph)
        + amp * 0.6 * Math.sin(3 * th - t * 0.42 + b.ph * 1.7)
        + amp * 0.35 * Math.sin(5 * th + t * 0.71 + b.ph * 0.6));
    }
    var pitch = Math.max(2, this._num('pitch'));
    var feather = Math.max(1, this._num('feather'));
    var dotR = this._num('dot-size') / 2;
    var buckets = [], used = [];
    for (var i = 0; i < LEVELS; i++) { buckets.push(new Path2D()); used.push(false); }
    var off = pitch / 2;
    for (var y = off; y < H; y += pitch) {
      for (var x = off; x < W; x += pitch) {
        var v = 0;
        for (var j = 0; j < 2; j++) {
          var b = blobs[j];
          var dx = x - b.cx, dy = y - b.cy;
          var d = Math.hypot(dx, dy);
          var f = (edge(b, Math.atan2(dy, dx)) - d) / feather;
          if (f > v) v = f;
        }
        if (v <= 0) continue;
        v = v >= 1 ? 1 : v * v * (3 - 2 * v); // smoothstep falloff
        var li = Math.min(LEVELS - 1, Math.floor(v * LEVELS));
        var r = dotR * (0.55 + 0.45 * v);
        buckets[li].moveTo(x + r, y);
        buckets[li].arc(x, y, r, 0, Math.PI * 2);
        used[li] = true;
      }
    }
    ctx.fillStyle = this.getAttribute('color') || DEFAULTS.color;
    var maxA = this._num('opacity');
    for (var k = 0; k < LEVELS; k++) {
      if (!used[k]) continue;
      ctx.globalAlpha = maxA * ((k + 1) / LEVELS);
      ctx.fill(buckets[k]);
    }
    ctx.globalAlpha = 1;
  };

  customElements.define('elastic-ambient-bg', ElasticAmbientBg);
})();
