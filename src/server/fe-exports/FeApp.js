var _ = require('lodash');
var join = require('path').join;

function FeApp(feExports, plugin, spec) {
  this.feExports = feExports;
  this.spec = spec;

  this.id = spec.id || plugin.name;
  this.publicDir = spec.publicDir || join(plugin.path, 'public');
  this.useModuleIds = _.once(this.useModuleIds);
}

FeApp.prototype.mainModuleId = function () {
  return this.spec.main;
};

FeApp.prototype.useModuleIds = function () {
  return this.feExports
  .find(_.get(this, 'spec.uses', []))
  .concat(this.feExports.aliases.baseEnv || []);
};

module.exports = FeApp;
