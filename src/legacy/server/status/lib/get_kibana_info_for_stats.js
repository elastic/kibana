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

import { get } from 'lodash';

const snapshotRegex = /-snapshot/i;

/**
 * This provides a meta data attribute along with Kibana stats.
 *
 * @param {Object} kbnServer manager of Kibana services - see `src/legacy/server/kbn_server` in Kibana core
 * @param {Object} config Server config
 * @param {String} host Kibana host
 * @return {Object} The object containing a "kibana" field and source instance details.
 */
export function getKibanaInfoForStats(server, kbnServer) {
  const config = server.config();
  const status = kbnServer.status.toJSON();

  return {
    uuid: config.get('server.uuid'),
    name: config.get('server.name'),
    index: config.get('kibana.index'),
    host: config.get('server.host'),
    locale: config.get('i18n.locale'),
    transport_address: `${config.get('server.host')}:${config.get('server.port')}`,
    version: kbnServer.version.replace(snapshotRegex, ''),
    snapshot: snapshotRegex.test(kbnServer.version),
    status: get(status, 'overall.state'),
  };
}
