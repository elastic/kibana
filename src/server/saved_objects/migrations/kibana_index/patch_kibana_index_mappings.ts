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

import { fetchMapping, patchIndexMappings } from '../core';
import { getMigrationPlugins } from './get_migration_plugins';
import { KibanaPlugin, Server } from './types';

// Require rather than import gets us around the lack of TypeScript definitions
// for "getTypes"
// tslint:disable-next-line:no-var-requires
const { getTypes } = require('../../../mappings');

export interface KbnServer {
  pluginSpecs: KibanaPlugin[];
  server: Server;
}

/**
 * patchKibanaIndexMappings applies changes to the Kibana index, including
 * patching the index mappings, and setting up an index template.
 *
 * @param {KbnServer} kbnServer - The root Kibana server instance
 * @returns {Promise<void>}
 */
export async function patchKibanaIndexMappings(kbnServer: KbnServer) {
  const { server } = kbnServer;
  const callCluster = await waitForElasticsearch(kbnServer);
  await assertNotV5Index(kbnServer);
  return patchIndexMappings({
    callCluster,
    index: server.config().get('kibana.index'),
    plugins: getMigrationPlugins(kbnServer),
  });
}

async function waitForElasticsearch({ server }: KbnServer) {
  if (!server.plugins.elasticsearch) {
    throw new Error(
      `Saved objects cannot initialize without the elasticsearch plugin.`
    );
  }
  await server.plugins.elasticsearch.waitUntilReady();
  return server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;
}

async function assertNotV5Index({ server }: KbnServer) {
  const callCluster = server.plugins.elasticsearch!.getCluster('admin')
    .callWithInternalUser;
  const index = server.config().get('kibana.index');
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
