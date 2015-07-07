'use strict';

let _ = require('lodash');
let UiApp = require('./UiApp');

module.exports = class UiApps extends Array {

  constructor(uiExports, parent) {
    super();

    this.uiExports = uiExports;

    if (!parent) {
      this.claimedIds = [];
      this.hidden = new UiApps(uiExports, this);
    } else {
      this.claimedIds = parent.claimedIds;
    }

  }

  new(plugin, spec) {
    if (this.hidden && spec.hidden) {
      return this.hidden.new(plugin, spec);
    }

    let app = new UiApp(this.uiExports, plugin, spec);

    if (_.includes(this.claimedIds, app.id)) {
      throw new Error('Unable to create two apps with the id ' + app.id + '.');
    } else {
      this.claimedIds.push(app.id);
    }

    this._byId = null;
    this.push(app);
  }

  get byId() {
    return this._byId || (this._byId = _.indexBy(this, 'id'));
  }

};
