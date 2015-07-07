'use strict';

var _ = require('lodash');
var minimatch = require('minimatch');

var UiApps = require('./UiApps');

class UiExports {
  constructor(kbnServer) {
    this.kbnServer = kbnServer;
    this.apps = new UiApps(this);
    this.appCount = 0;
    this.aliases = {};
    this.exportConsumer = _.memoize(this.exportConsumer);
  }

  consumePlugin(plugin) {
    var self = this;
    var types = _.keys(plugin.uiExportSpecs);

    if (!types) return false;

    var unkown = _.reject(types, self.exportConsumer, self);
    if (unkown.length) {
      throw new Error('unknown export types ' + unkown.join(', ') + ' in plugin ' + plugin.id);
    }

    types.forEach(function (type) {
      self.exportConsumer(type)(plugin, plugin.uiExportSpecs[type]);
    });
  }

  exportConsumer(type) {
    var self = this;
    switch (type) {
    case 'app':
      return function (plugin, spec) {
        self.apps.new(plugin, spec);
      };

    case 'visTypes':
    case 'fieldFormats':
    case 'spyModes':
      return function (plugin, spec) {
        self.aliases[type] = _.union(self.aliases[type] || [], spec);
      };

    case 'modules':
    case 'loaders':
      return function (plugin, spec) {
        plugin.uiExportSpecs[type] = spec;
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
}

module.exports = UiExports;
