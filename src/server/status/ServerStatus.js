'use strict';

let _ = require('lodash');

let states = require('./states');
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
    plugin.status = this.create(`plugin:${plugin.id}`);
  }

  overall() {
    var id = _.sortBy(this._created, function (status) {
      return states.get(status.state).severity;
    }).pop().state;
    var state = states.get(id);

    var statuses = _.where(this._created, { state: state.id });
    var since = _.get(_.sortBy(statuses, 'since'), [0, 'since']);

    return {
      state: state.id,
      since: since,
      icon: state.icon,
      description: _.sample(state.nicknames) || state.id,
    };
  }

  toJSON() {
    return {
      overall: this.overall(),
      statuses: _.values(this._created)
    };
  }
};
