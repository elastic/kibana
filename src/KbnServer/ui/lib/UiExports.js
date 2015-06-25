var _ = require('lodash');
var minimatch = require('minimatch');

var UiApp = require('./UiApp');

function UiExports(defaultModules) {
  this.apps = {};
  this.aliases = {};
  this.defaultModules = defaultModules || [];
  this.exportConsumer = _.memoize(this.exportConsumer);
}

UiExports.prototype.add = function (plugin, exports) {
  var self = this;
  var unkown = _(exports).keys().reject(self.exportConsumer, self).value();
  if (unkown.length) {
    throw new Error('unknown export types ' + unkown.join(', ') + ' in plugin ' + plugin.name);
  }

  _.forOwn(exports, function (spec, type) {
    self.exportConsumer(type)(plugin, spec);
  });
};

UiExports.prototype.exportConsumer = function (type) {
  var self = this;
  switch (type) {
  case 'app':
    return function (plugin, spec) {
      var app = new UiApp(self, plugin, spec);

      if (self.apps[app.id]) {
        throw new Error('Unable to create two apps with the id ' + app.id + '.');
      }

      self.apps[app.id] = app;
    };
  case 'visTypes':
  case 'fieldFormats':
  case 'spyModes':
    return function (plugin, spec) {
      self.aliases[type] = _.union(spec, self.aliases[type] || []);
    };
  case 'aliases':
    return function (plugin, specs) {
      _.forOwn(specs, function (spec, adhocType) {
        self.aliases[adhocType] = _.union(spec, self.aliases[adhocType] || []);
      });
    };
  }
};

UiExports.prototype.find = function (patterns) {
  var aliases = this.aliases;
  var names = _.keys(aliases);
  var matcher = _.partialRight(minimatch.filter, { matchBase: true });

  return _.chain(patterns)
  .map(function (pattern) {
    var matches = names.filter(matcher(pattern));
    if (!matches.length) {
      throw new Error('Unable to find uiExports for pattern ' + pattern);
    }
    return matches;
  })
  .flattenDeep()
  .reduce(function (found, name) {
    return found.concat(aliases[name]);
  }, [])
  .union(this.defaultModules)
  .value();
};

module.exports = UiExports;
