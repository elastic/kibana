'use strict';

var _ = require('lodash');
var join = require('path').join;
var autoload = require('./autoload');

class UiApp {
  constructor(uiExports, spec) {
    this.uiExports = uiExports;
    this.spec = spec || {};

    this.id = this.spec.id;
    if (!this.id) {
      throw new Error('Every app must specify it\'s id');
    }

    this.main = this.spec.main;
    this.title = this.spec.title;
    this.description = this.spec.description;
    this.icon = this.spec.icon;
    this.hidden = this.spec.hidden;
    this.autoloadOverrides = this.spec.autoload;
    this.templateName = this.spec.templateName || 'uiApp';
    this.requireOptimizeGreen = this.spec.requireOptimizeGreen !== false;
    this.getModules = _.once(this.getModules);
  }

  getModules() {
    return _([
      this.autoloadOverrides || autoload.require,
      this.uiExports.find(_.get(this, 'spec.uses', [])),
    ])
    .flatten()
    .uniq()
    .push(this.main)
    .value();
  }

  getRelatedPlugins() {
    var pluginsById = this.uiExports.kbnServer.plugins.byId;
    return _.transform(this.getModules(), function (plugins, id) {
      var matches = id.match(/^plugins\/([^\/]+)(?:\/|$)/);
      if (!matches) return;

      var plugin = pluginsById[matches[1]];
      if (_.includes(plugins, plugin)) return;
      plugins.push(plugin);
    }, []);
  }

  toJSON() {
    return _.pick(this, ['id', 'title', 'description', 'icon', 'main']);
  }
}

module.exports = UiApp;
