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


import {
  SavedObjectsRepository,
  ScopedSavedObjectsClientProvider,
  SavedObjectsRepositoryProvider,
} from './lib';
import { getRootPropertiesObjects } from '../../mappings';
import { SavedObjectsClient } from './saved_objects_client';

// The migrator here is (hopefully) temporary. We currently use the saved object API to perform
// import / export from the Kibana UI. Import / export functionality needs to apply migrations to documents.
// Eventually, we hope to build a first-class import / export API, at which point, we can
// remove the migrator from the saved objects client and leave only document validation here.
export function createSavedObjectsService(server, schema, serializer, migrator) {
  const mappings = server.getKibanaIndexMappingsDsl();
  const repositoryProvider = new SavedObjectsRepositoryProvider({
    index: server.config().get('kibana.index'),
    migrator,
    mappings,
    schema,
    serializer,
  });

  const scopedClientProvider = new ScopedSavedObjectsClientProvider({
    index: server.config().get('kibana.index'),
    mappings,
    defaultClientFactory({
      request,
    }) {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
      const callCluster = (...args) => callWithRequest(request, ...args);

      const repository = repositoryProvider.getRepository(callCluster);

      return new SavedObjectsClient(repository);
    },
  });

  return {
    types: Object.keys(getRootPropertiesObjects(mappings)),
    SavedObjectsClient,
    SavedObjectsRepository,
    getSavedObjectsRepository: (...args) => repositoryProvider.getRepository(...args),
    getScopedSavedObjectsClient: (...args) => scopedClientProvider.getClient(...args),
    setScopedSavedObjectsClientFactory: (...args) => scopedClientProvider.setClientFactory(...args),
    addScopedSavedObjectsClientWrapperFactory: (...args) =>
      scopedClientProvider.addClientWrapperFactory(...args),
  };
}
