(function() {
  var Autoprefixer, Browsers, Prefixes, autoprefixer, infoCache, isPlainObject, postcss,
    __slice = [].slice,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  postcss = require('postcss');

  Browsers = require('./browsers');

  Prefixes = require('./prefixes');

  infoCache = null;

  isPlainObject = function(obj) {
    return Object.prototype.toString.apply(obj) === '[object Object]';
  };

  autoprefixer = function() {
    var browsers, options, prefixes, reqs;
    reqs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (reqs.length === 1 && isPlainObject(reqs[0])) {
      options = reqs[0];
      reqs = void 0;
    } else if (reqs.length === 0 || (reqs.length === 1 && (reqs[0] == null))) {
      reqs = void 0;
    } else if (reqs.length <= 2 && (reqs[0] instanceof Array || (reqs[0] == null))) {
      options = reqs[1];
      reqs = reqs[0];
    } else if (typeof reqs[reqs.length - 1] === 'object') {
      options = reqs.pop();
    }
    if ((options != null ? options.browsers : void 0) != null) {
      reqs = options.browsers;
    } else if (reqs) {
      if (typeof console !== "undefined" && console !== null) {
        console.warn('autoprefixer: autoprefixer(browsers) is deprecated ' + 'and will be removed in 3.1. ' + 'Use autoprefixer({ browsers: browsers }).');
      }
    }
    if (reqs == null) {
      reqs = autoprefixer["default"];
    }
    browsers = new Browsers(autoprefixer.data.browsers, reqs);
    prefixes = new Prefixes(autoprefixer.data.prefixes, browsers, options);
    return new Autoprefixer(prefixes, autoprefixer.data);
  };

  autoprefixer.data = {
    browsers: require('../data/browsers'),
    prefixes: require('../data/prefixes')
  };

  Autoprefixer = (function() {
    function Autoprefixer(prefixes, data, options) {
      this.prefixes = prefixes;
      this.data = data;
      this.options = options != null ? options : {};
      this.postcss = __bind(this.postcss, this);
      this.browsers = this.prefixes.browsers.selected;
    }

    Autoprefixer.prototype.process = function(str, options) {
      if (options == null) {
        options = {};
      }
      return this.processor().process(str, options);
    };

    Autoprefixer.prototype.postcss = function(css) {
      this.prefixes.processor.remove(css);
      return this.prefixes.processor.add(css);
    };

    Autoprefixer.prototype.info = function() {
      infoCache || (infoCache = require('./info'));
      return infoCache(this.prefixes);
    };

    Autoprefixer.prototype.processor = function() {
      return this.processorCache || (this.processorCache = postcss(this.postcss));
    };

    return Autoprefixer;

  })();

  autoprefixer["default"] = ['> 1%', 'last 2 versions', 'Firefox ESR', 'Opera 12.1'];

  autoprefixer.loadDefault = function() {
    return this.defaultCache || (this.defaultCache = autoprefixer({
      browsers: this["default"]
    }));
  };

  autoprefixer.process = function(str, options) {
    if (options == null) {
      options = {};
    }
    return this.loadDefault().process(str, options);
  };

  autoprefixer.postcss = function(css) {
    return autoprefixer.loadDefault().postcss(css);
  };

  autoprefixer.info = function() {
    return this.loadDefault().info();
  };

  module.exports = autoprefixer;

}).call(this);
