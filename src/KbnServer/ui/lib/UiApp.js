var _ = require('lodash');
var join = require('path').join;

function UiApp(uiExports, plugin, spec) {
  this.uiExports = uiExports;
  this.spec = spec;

  this.id = spec.id || plugin.name;
  this.publicDir = spec.publicDir || join(plugin.path, 'public');
  this.useModuleIds = _.once(this.useModuleIds);
}

UiApp.prototype.mainModuleId = function () {
  return this.spec.main;
};

UiApp.prototype.useModuleIds = function () {
  return this.uiExports.find(_.get(this, 'spec.uses', []));
};

module.exports = UiApp;
