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

/*
 * This file creates the migration options for migrating the Kibana index.
 * The object built here can be passed to the core migration functions in
 * order to migrate the Kibana index.
*/

import { CallCluster, fetchMapping } from '../core';
import { buildKibanaMigrationInfo } from './build_kibana_migration_info';
import { KibanaPlugin } from './types';

// Require rather than import gets us around the lack of TypeScript definitions
// for "getTypes"
// tslint:disable-next-line:no-var-requires
const { getTypes } = require('../../../mappings');

interface ElasticsearchPlugin {
  getCluster: ((name: 'admin') => { callWithInternalUser: CallCluster });
  waitUntilReady: () => Promise<any>;
}

interface Server {
  config: () => { get: (path: 'kibana.index') => string };
  plugins: { elasticsearch: ElasticsearchPlugin | undefined };
}

interface KbnServer {
  pluginSpecs: KibanaPlugin[];
  server: Server;
}

interface Opts {
  kbnServer: KbnServer;
}

/**
 * Builds the migration options for migrating the Kibana index.
 *
 * @export
 * @param {Opts}
 * @prop {KbnServer} kbnServer
 * @returns {MigrationOptions}
 */
export async function fetchKibanaMigrationOpts({ kbnServer }: Opts) {
  const { server } = kbnServer;
  const callCluster = await waitForElasticsearch(kbnServer);
  const index = server.config().get('kibana.index');

  await assertNotV5Index(callCluster, index);

  return {
    ...buildKibanaMigrationInfo({ kbnServer }),
    callCluster,
    index,
  };
}

/**
 * Wait until the elasticsearch plugin says it's ready, then return the
 * elasticsearch connection that will be used to run migrations.
 */
async function waitForElasticsearch({ server }: KbnServer) {
  if (!server.plugins.elasticsearch) {
    throw new Error(
      `Saved objects cannot initialize without the elasticsearch plugin.`
    );
  }
  await server.plugins.elasticsearch.waitUntilReady();
  return server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;
}

/**
 * We need to fail if we're attempting to build migration options for a pre 6.x
 * index, as this is not supported.
 */
async function assertNotV5Index(callCluster: CallCluster, index: string) {
  const mappings = await fetchMapping(callCluster, index);
  if (!mappings) {
    return;
  }
  const currentTypes = getTypes(mappings);
  const isV5Index = currentTypes.length > 1 || currentTypes[0] !== 'doc';
  if (isV5Index) {
    throw new Error(
      'Your Kibana index is out of date, reset it or use the X-Pack upgrade assistant.'
    );
  }
  return mappings;
}
