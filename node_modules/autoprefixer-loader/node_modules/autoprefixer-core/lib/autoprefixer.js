(function() {
  var Browsers, Prefixes, browserslist, cache, isPlainObject, postcss,
    slice = [].slice;

  browserslist = require('browserslist');

  postcss = require('postcss');

  Browsers = require('./browsers');

  Prefixes = require('./prefixes');

  isPlainObject = function(obj) {
    return Object.prototype.toString.apply(obj) === '[object Object]';
  };

  cache = {};

  module.exports = postcss.plugin('autoprefixer', function() {
    var loadPrefixes, options, plugin, reqs;
    reqs = 1 <= arguments.length ? slice.call(arguments, 0) : [];
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
    options || (options = {});
    if (options.browsers != null) {
      reqs = options.browsers;
    }
    loadPrefixes = function(opts) {
      var browsers, key;
      browsers = new Browsers(module.exports.data.browsers, reqs, opts);
      key = browsers.selected.join(', ') + options.cascade;
      return cache[key] || (cache[key] = new Prefixes(module.exports.data.prefixes, browsers, options));
    };
    plugin = function(css, result) {
      var prefixes;
      prefixes = loadPrefixes({
        from: css.source.input.file
      });
      if (options.remove !== false) {
        prefixes.processor.remove(css);
      }
      if (options.add !== false) {
        return prefixes.processor.add(css, result);
      }
    };
    plugin.options = options;
    plugin.process = function(str, options) {
      if (options == null) {
        options = {};
      }
      if (typeof console !== "undefined" && console !== null) {
        if (typeof console.warn === "function") {
          console.warn('Autoprefixer\'s process() method is deprecated ' + 'and will removed in next major release. ' + 'Use postcss([autoprefixer]).process() instead');
        }
      }
      return postcss(plugin).process(str, options);
    };
    plugin.info = function(opts) {
      return require('./info')(loadPrefixes(opts));
    };
    return plugin;
  });

  module.exports.data = {
    browsers: require('caniuse-db/data').agents,
    prefixes: require('../data/prefixes')
  };

  module.exports.defaults = browserslist.defaults;

  module.exports.process = function(css, options) {
    return module.exports().process(css, options);
  };

  module.exports.info = function() {
    return module.exports().info();
  };

}).call(this);
