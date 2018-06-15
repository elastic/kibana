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

import { patchKibanaIndexMappings } from '../migrations';
import { SavedObjectsRepository, ScopedSavedObjectsClientProvider, SavedObjectsRepositoryProvider } from './lib';
import { SavedObjectsClient } from './saved_objects_client';

export function createSavedObjectsService(kbnServer, server) {
  const onBeforeWrite = createPatchKibanaIndexFunction(kbnServer);

  const repositoryProvider = new SavedObjectsRepositoryProvider({
    index: server.config().get('kibana.index'),
    mappings: server.getKibanaIndexMappingsDsl(),
    onBeforeWrite,
  });

  const scopedClientProvider = new ScopedSavedObjectsClientProvider({
    index: server.config().get('kibana.index'),
    mappings: server.getKibanaIndexMappingsDsl(),
    onBeforeWrite,
    defaultClientFactory({
      request,
    }) {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
      const callCluster = (...args) => callWithRequest(request, ...args);

      const repository = repositoryProvider.getRepository(callCluster);

      return new SavedObjectsClient(repository);
    }
  });

  return {
    SavedObjectsClient,
    SavedObjectsRepository,
    getSavedObjectsRepository: (...args) =>
      repositoryProvider.getRepository(...args),
    getScopedSavedObjectsClient: (...args) =>
      scopedClientProvider.getClient(...args),
    setScopedSavedObjectsClientFactory: (...args) =>
      scopedClientProvider.setClientFactory(...args),
    addScopedSavedObjectsClientWrapperFactory: (...args) =>
      scopedClientProvider.addClientWrapperFactory(...args),
  };
}

// Creates a function that sets the mappings / index templates for the
// Kibana index. The patchKibanaIndexMappings call is somewhat expensive,
// so we do a little caching to prevent it from being called more than
// once. This can fail (e.g. if elasticsearch is unavailable), which is why
// we don't use something like lodash's 'once'.
function createPatchKibanaIndexFunction(kbnServer) {
  let initialized = false;
  return async function patchIndexOnce() {
    if (!initialized) {
      await patchKibanaIndexMappings(kbnServer);
      initialized = true;
    }
  };
}
