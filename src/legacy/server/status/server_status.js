/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';

import * as states from './states';
import Status from './status';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { pkg } from '../../../core/server/utils';

export default class ServerStatus {
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
    if (plugin.version === 'kibana') plugin.version = pkg.version;
    const status = this.create(`plugin:${plugin.id}@${plugin.version}`);
    status.plugin = plugin;
    return status;
  }

  each(fn) {
    const self = this;
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
    const state = Object
      // take all created status objects
      .values(this._created)
      // get the state descriptor for each status
      .map(status => states.get(status.state))
      // reduce to the state with the highest severity, defaulting to green
      .reduce((a, b) => a.severity > b.severity ? a : b, states.get('green'));

    const statuses = _.where(this._created, { state: state.id });
    const since = _.get(_.sortBy(statuses, 'since'), [0, 'since']);

    return {
      state: state.id,
      title: state.title,
      nickname: _.sample(state.nicknames),
      icon: state.icon,
      uiColor: states.get(state.id).uiColor,
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
    const overall = this.overall();
    return `${overall.title} – ${overall.nickname}`;
  }

  toJSON() {
    return {
      overall: this.overall(),
      statuses: _.values(this._created)
    };
  }
}
