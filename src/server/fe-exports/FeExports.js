var _ = require('lodash');
var minimatch = require('minimatch');

var FeApp = require('./FeApp');

function FeExportsCollection(kibana) {
  this.kibana = kibana;
  this.apps = {};
  this.aliases = {};
  this.getConsumer = _.memoize(this.getConsumer);
}

FeExportsCollection.prototype.readExports = function (plugin, exports) {
  var self = this;
  var unkown = _(exports).keys().reject(self.getConsumer, self).value();
  if (unkown.length) {
    throw new Error('unknown export types ' + unkown.join(', ') + ' in plugin ' + plugin.name);
  }

  _.forOwn(exports, function (spec, type) {
    self.getConsumer(type)(plugin, spec);
  });
};

FeExportsCollection.prototype.getConsumer = function (type) {
  var self = this;
  switch (type) {
  case 'app':
    return function (plugin, spec) {
      var app = new FeApp(self, plugin, spec);

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

FeExportsCollection.prototype.find = function (patterns) {
  var aliases = this.aliases;
  var names = _.keys(aliases);
  var matcher = _.partialRight(minimatch.filter, { matchBase: true });

  return _.chain(patterns)
  .map(function (pattern) {
    return names.filter(matcher(pattern));
  })
  .flattenDeep()
  .reduce(function (found, name) {
    return found.concat(aliases[name]);
  }, [])
  .value();
};

module.exports = FeExportsCollection;
