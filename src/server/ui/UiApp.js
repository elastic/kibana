'use strict';

var _ = require('lodash');
var join = require('path').join;
var defAutoload = require('./autoload');

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
    this.getModules = _.once(this.getModules);
  }

  autoload(type) {
    return _.get(this.autoloadOverrides, type, defAutoload[type]) || [];
  }

  getModules() {
    return {
      // there current isn't any way to extend the default angular modules
      angular: this.autoload('angular'),
      require: _([
        this.autoload('require'),
        this.uiExports.find(_.get(this, 'spec.uses', [])),
      ])
      .flatten()
      .sort()
      .uniq(true)
      .push(this.main)
      .value()
    };
  }

  relatedPlugins() {
    var pluginsById = _.indexBy(this.uiExports.kbnServer.plugins, 'id');
    return _.transform(this.getModules().require, function (plugins, id) {
      var matches = id.match(/^plugins\/([^\/]+)(?:\/|$)/);
      if (!matches) return;
      plugins.push(pluginsById[matches[1]]);
    }, []);
  }

  toJSON() {
    return _.pick(this, ['id', 'title', 'description', 'icon', 'main']);
  }
}

module.exports = UiApp;
