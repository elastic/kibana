'use strict';

let _ = require('lodash');

let Status = require('./Status');

module.exports = class ServerStatus {
  constructor(server) {
    this.server = server;
    this._created = {};
  }

  create(name) {
    return (this._created[name] = new Status(name, this.server));
  }

  each(fn) {
    let self = this;
    _.forOwn(self._created, function (status, i, list) {
      if (status.state !== 'disabled') {
        fn.call(self, status, i, list);
      }
    });
  }

  decoratePlugin(plugin) {
    plugin.status = this.create(plugin.id);
  }

  toJSON() {
    return this._created;
  }
};
