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

import { SavedObjectsRepository, ScopedSavedObjectsClientProvider } from './lib';
import { SavedObjectsClient } from './saved_objects_client';
import { initializeSavedObjectIndices } from '../migrations';

export function createSavedObjectsService(kbnServer, server) {
  const scopedClientProvider = new ScopedSavedObjectsClientProvider({
    index: server.config().get('kibana.index'),
    mappings: server.getKibanaIndexMappingsDsl(),
    onBeforeWrite: createInitFunction(kbnServer),
    defaultClientFactory({
      request,
      index,
      mappings,
      onBeforeWrite
    }) {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
      const callCluster = (...args) => callWithRequest(request, ...args);

      const repository = new SavedObjectsRepository({
        index,
        mappings,
        callCluster,
        onBeforeWrite,
      });

      return new SavedObjectsClient(repository);
    }
  });

  return {
    SavedObjectsClient,
    SavedObjectsRepository,
    getScopedSavedObjectsClient: (...args) =>
      scopedClientProvider.getClient(...args),
    setScopedSavedObjectsClientFactory: (...args) =>
      scopedClientProvider.setClientFactory(...args),
    addScopedSavedObjectsClientWrapperFactory: (...args) =>
      scopedClientProvider.addClientWrapperFactory(...args),
  };
}

// Creates a migrator object and initializes the associated indices.
// The initializeSavedObjectIndices call is somewhat expensive, so we
// don't want to do it prior to *every* write, so we cache it.
// This can fail (e.g. if elasticsearch is unavailable), which is why
// we don't use something like lodash's 'once', as we only want to
// cache the resulting migrator once it's succeeded.
function createInitFunction(kbnServer) {
  let initialized = false;
  return async function getMigrator() {
    if (!initialized) {
      await initializeSavedObjectIndices(kbnServer);
      initialized = true;
    }
  };
}
