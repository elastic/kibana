var _ = require('lodash');
var join = require('path').join;

function UiApp(uiExports, plugin, spec) {
  this.uiExports = uiExports;
  this.plugin = plugin || null;
  this.spec = spec || {};

  this.id = this.spec.id || _.get(this, 'plugin.name');
  if (!this.id) {
    throw new Error('Every app must specify it\'s id');
  }

  this.main = this.spec.main;
  this.title = this.spec.title;
  this.description = this.spec.description;
  this.icon = this.spec.icon;
  this.useModuleIds = _.once(this.useModuleIds);
}

UiApp.prototype.useModuleIds = function () {
  return this.uiExports.find(_.get(this, 'spec.uses', []));
};

UiApp.prototype.toJSON = function () {
  return _.pick(this, ['id', 'title', 'description', 'icon', 'publicDir', 'main']);
};

module.exports = UiApp;
