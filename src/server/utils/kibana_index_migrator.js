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

import { createMigrator, buildMappings } from '@kbn/migrations';

export async function getKibanaIndexMigrator(kbnServer) {
  const { server } = kbnServer;
  return createMigrator({
    callCluster: server.plugins.elasticsearch.getCluster('admin').callWithInternalUser,
    index: server.config().get('kibana.index'),
    kibanaVersion: kbnServer.version,
    log: (...args) => server.log(...args),
    plugins: migrationPlugins(kbnServer.pluginSpecs),
  });
}

export function buildKibanaMappings(kbnServer) {
  return buildMappings({
    kibanaVersion: kbnServer.version,
    plugins: migrationPlugins(kbnServer.pluginSpecs),
  });
}

export async function initializeKibanaIndex(kbnServer) {
  const { server } = kbnServer;
  if (!kbnServer.server.plugins.elasticsearch) {
    server.log(['warn', 'migration'], 'The elasticsearch plugin is unavailable. Skipping index patching.');
    return;
  }
  await kbnServer.server.plugins.elasticsearch.waitUntilReady();
  const migrator = await getKibanaIndexMigrator(kbnServer);
  return migrator.patchIndex();
}

function migrationPlugins(plugins) {
  const emptySpec = { mappings: undefined };
  return plugins.map(p => ({
    id: p.getId(),
    mappings: (p.getExportSpecs() || emptySpec).mappings,
  }));
}