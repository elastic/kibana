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

import { CallCluster, fetchMapping, initializeIndex } from '../core';
import { getMigrationPlugins } from './get_migration_plugins';
import { KibanaPlugin } from './types';

export interface ElasticsearchPlugin {
  getCluster: ((name: 'admin') => { callWithInternalUser: CallCluster });
  waitUntilReady: () => Promise<any>;
}

export interface Server {
  config: () => { get: (path: 'kibana.index') => string };
  plugins: { elasticsearch: ElasticsearchPlugin | undefined };
}

export interface KbnServer {
  version: string;
  pluginSpecs: KibanaPlugin[];
  server: Server;
}

/**
 * initializeSavedObjectIndices applies changes to the saved object client
 * index (or indices) which are required for the saved objects to function
 * properly. This includes patching the index mappings, and setting up an index
 * template.
 *
 * @param {KbnServer} kbnServer - The root Kibana server instance
 * @returns {Promise<void>}
 */
export async function initializeSavedObjectIndices(kbnServer: KbnServer) {
  await waitForElasticsearch(kbnServer);
  await assertNotV5Index(kbnServer);
  await initializeKibanaIndex(kbnServer);
}

async function waitForElasticsearch({ server }: KbnServer) {
  if (!server.plugins.elasticsearch) {
    throw new Error(
      `Saved objects cannot initialize without the elasticsearch plugin.`
    );
  }
  await server.plugins.elasticsearch.waitUntilReady();
}

async function assertNotV5Index({ server }: KbnServer) {
  const callCluster = server.plugins.elasticsearch!.getCluster('admin')
    .callWithInternalUser;
  const index = server.config().get('kibana.index');
  const mappings = await fetchMapping(callCluster, index);
  if (!mappings) {
    return;
  }
  const currentTypes = Object.keys(mappings).filter(
    type => type !== '_default_'
  );
  const isV5Index = currentTypes.length > 1 || currentTypes[0] !== 'doc';
  if (isV5Index) {
    throw new Error(
      'Your Kibana index is out of date, reset it or use the X-Pack upgrade assistant.'
    );
  }
  return mappings;
}

async function initializeKibanaIndex(kbnServer: KbnServer) {
  const { server } = kbnServer;
  if (!server.plugins.elasticsearch) {
    throw new Error(
      'Saved objects require the elasticsearch plugin, but it is disabled'
    );
  }
  return initializeIndex({
    callCluster: server.plugins.elasticsearch.getCluster('admin')
      .callWithInternalUser,
    index: server.config().get('kibana.index'),
    kibanaVersion: kbnServer.version,
    plugins: getMigrationPlugins(kbnServer),
  });
}
