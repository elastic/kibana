var _ = require('lodash');
var fromRoot = require('../utils/fromRoot');

var asRegExp = _.flow(
  _.escapeRegExp,
  function (path) {
    return path + '(?:\\.js)?$';
  },
  RegExp
);

function OptmzUiExports(plugins) {
  // regular expressions which will prevent webpack from parsing the file
  var noParse = this.noParse = [];

  // webpack aliases, like require paths, mapping a prefix to a directory
  var aliases = this.aliases = {
    ui: fromRoot('src/ui/public'),
    testHarness: fromRoot('src/testHarness/public')
  };

  // webpack loaders map loader configuration to regexps
  var loaders = this.loaders = [];

  var claimedModuleIds = {};
  _.each(plugins, function (plugin) {
    var exports = plugin.uiExportsSpecs;

    // add an alias for this plugins public directory
    if (plugin.publicDir) {
      aliases[`plugins/${plugin.id}`] = plugin.publicDir;
    }

    // consume the plugin's "modules" exports
    _.forOwn(exports.modules, function (spec, id) {
      if (claimedModuleIds[id]) {
        throw new TypeError(`Plugin ${plugin.id} attempted to override export "${id}" from ${claimedModuleIds[id]}`);
      } else {
        claimedModuleIds[id] = plugin.id;
      }

      // configurable via spec
      var path;
      var parse = true;
      var imports = null;
      var exports = null;
      var expose = null;

      // basic style, just a path
      if (_.isString(spec)) path = spec;

      if (_.isArray(spec)) {
        path = spec[0];
        imports = spec[1];
        exports = spec[2];
      }

      if (_.isPlainObject(spec)) {
        path = spec.path;
        parse = _.get(spec, 'parse', parse);
        imports = _.get(spec, 'imports', imports);
        exports = _.get(spec, 'exports', exports);
        expose = _.get(spec, 'expose', expose);
      }

      if (!path) {
        throw new TypeError('Invalid spec definition, unable to identify path');
      }

      aliases[id] = path;

      var loader = [];
      if (imports) {
        loader.push(`imports?${imports}`);
      }

      if (exports) loader.push(`exports?${exports}`);
      if (expose) loader.push(`expose?${expose}`);
      if (loader.length) loaders.push({ test: asRegExp(path), loader: loader.join('!') });

      if (!parse) noParse.push(asRegExp(path));
    });

    // consume the plugin's "loaders" exports
    _.each(exports.loaders, function (loader) {
      loaders.push(loader);
    });


    // consume the plugin's "noParse" exports
    _.each(exports.noParse, function (regExp) {
      noParse.push(regExp);
    });

  });
}

module.exports = OptmzUiExports;
