import _ from 'lodash';

import states from './states';
import Status from './status';

module.exports = class ServerStatus {
  constructor(server) {
    this.server = server;
    this._created = {};
  }

  create(id) {
    const status = new Status(id, this.server);
    this._created[status.id] = status;
    return status;
  }

  createForPlugin(plugin) {
    const status = this.create(`plugin:${plugin.id}@${plugin.version}`);
    status.plugin = plugin;
    return status;
  }

  each(fn) {
    let self = this;
    _.forOwn(self._created, function (status, i, list) {
      if (status.state !== 'disabled') {
        fn.call(self, status, i, list);
      }
    });
  }

  get(id) {
    return this._created[id];
  }

  getForPluginId(pluginId) {
    return _.find(this._created, s =>
      s.plugin && s.plugin.id === pluginId
    );
  }

  getState(id) {
    const status = this.get(id);
    if (!status) return undefined;
    return status.state || 'uninitialized';
  }

  getStateForPluginId(pluginId) {
    const status = this.getForPluginId(pluginId);
    if (!status) return undefined;
    return status.state || 'uninitialized';
  }

  overall() {
    let state = _(this._created)
    .map(function (status) {
      return states.get(status.state);
    })
    .sortBy('severity')
    .pop();

    let statuses = _.where(this._created, { state: state.id });
    let since = _.get(_.sortBy(statuses, 'since'), [0, 'since']);

    return {
      state: state.id,
      title: state.title,
      nickname: _.sample(state.nicknames),
      icon: state.icon,
      since: since,
    };
  }

  isGreen() {
    return (this.overall().state === 'green');
  }

  notGreen() {
    return !this.isGreen();
  }

  toString() {
    let overall = this.overall();
    return `${overall.title} – ${overall.nickname}`;
  }

  toJSON() {
    return {
      overall: this.overall(),
      statuses: _.values(this._created)
    };
  }
};
