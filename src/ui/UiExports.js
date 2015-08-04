var _ = require('lodash');
var minimatch = require('minimatch');

var UiApps = require('./UiApps');

class UiExports {
  constructor(kbnServer) {
    this.kbnServer = kbnServer;
    this.apps = new UiApps(this);
    this.aliases = {};
    this.exportConsumer = _.memoize(this.exportConsumer);

    kbnServer.plugins.forEach(_.bindKey(this, 'consumePlugin'));
  }

  consumePlugin(plugin) {
    var self = this;
    var types = _.keys(plugin.uiExportsSpecs);

    if (!types) return false;

    var unkown = _.reject(types, self.exportConsumer, self);
    if (unkown.length) {
      throw new Error('unknown export types ' + unkown.join(', ') + ' in plugin ' + plugin.id);
    }

    types.forEach(function (type) {
      self.exportConsumer(type)(plugin, plugin.uiExportsSpecs[type]);
    });
  }

  exportConsumer(type) {
    var self = this;
    switch (type) {
      case 'app':
        return function (plugin, spec) {
          spec = _.defaults({}, spec, { id: plugin.id });
          plugin.app = self.apps.new(spec);
        };

      case 'visTypes':
      case 'fieldFormats':
      case 'spyModes':
        return function (plugin, spec) {
          self.aliases[type] = _.union(self.aliases[type] || [], spec);
        };

      case 'modules':
      case 'loaders':
      case 'noParse':
        return function (plugin, spec) {
          plugin.uiExportsSpecs[type] = spec;
        };

      case 'aliases':
        return function (plugin, specs) {
          _.forOwn(specs, function (spec, adhocType) {
            self.aliases[adhocType] = _.union(self.aliases[adhocType] || [], spec);
          });
        };
    }
  }

  find(patterns) {
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
    .value();
  }

  allApps() {
    return _.union(this.apps, this.apps.hidden);
  }
}

module.exports = UiExports;
