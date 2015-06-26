var _ = require('lodash');
var join = require('path').join;
var defaultModules = require('./defaultModules');

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
  this.getModules = _.once(this.getModules);

  this.defaultModules = this.spec.defaultModules;
  if (!this.defaultModules) {
    this.defaultModules = defaultModules();
  }
}

UiApp.prototype.getModules = function () {
  return {
    main: [this.main],
    // there current isn't any way to extend the default angular modules
    angular: this.defaultModules.angular || [],
    require: _.union(
      this.defaultModules.require || [],
      this.uiExports.find(_.get(this, 'spec.uses', []))
    )
  };
};

UiApp.prototype.toJSON = function () {
  return _.pick(this, ['id', 'title', 'description', 'icon', 'main']);
};

module.exports = UiApp;
