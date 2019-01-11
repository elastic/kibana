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

import elasticsearch from 'elasticsearch';
import { cloneDeep, pick } from 'lodash';

import { parseConfig } from './parse_config';

export class Cluster {
  constructor(config) {
    this._config = {
      ...config
    };
    this.errors = elasticsearch.errors;

    this._clients = new Set();
    this._client = this.createClient();

    return this;
  }

  getClient = () => this._client;

  close() {
    for (const client of this._clients) {
      client.close();
    }

    this._clients.clear();
  }

  createClient = (configOverrides, parseOptions) => {
    const config = {
      ...this._getClientConfig(),
      ...configOverrides
    };

    const client = new elasticsearch.Client(parseConfig(config, parseOptions));
    this._clients.add(client);
    return client;
  }

  _getClientConfig = () => {
    return getClonedProperties(this._config, [
      'hosts',
      'ssl',
      'username',
      'password',
      'customHeaders',
      'plugins',
      'apiVersion',
      'keepAlive',
      'pingTimeout',
      'requestTimeout',
      'sniffOnStart',
      'sniffInterval',
      'sniffOnConnectionFault',
      'log'
    ]);
  }
}

function getClonedProperties(config, paths) {
  return cloneDeep(paths ? pick(config, paths) : config);
}
