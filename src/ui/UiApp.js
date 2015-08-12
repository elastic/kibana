var _ = require('lodash');
var { join } = require('path');
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

    // once this resolves, no reason to run it again
    this.getModules = _.once(this.getModules);

    // variables that are injected into the browser, must serialize to JSON
    this.getInjectedVars = this.spec.injectVars || _.noop;
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

  toJSON() {
    return _.pick(this, ['id', 'title', 'description', 'icon', 'main']);
  }
}

module.exports = UiApp;
