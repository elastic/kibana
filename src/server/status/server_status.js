import _ from 'lodash';

import states from './states';
import Status from './status';

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

  get(name) {
    return this._created[name];
  }

  getState(name) {
    return _.get(this._created, [name, 'state'], 'uninitialized');
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
