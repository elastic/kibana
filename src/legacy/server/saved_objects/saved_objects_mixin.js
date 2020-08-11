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

// Disable lint errors for imports from src/core/server/saved_objects until SavedObjects migration is complete
/* eslint-disable @kbn/eslint/no-restricted-paths */
import { SavedObjectsSchema } from '../../../core/server/saved_objects/schema';
import {
  SavedObjectsClient,
  SavedObjectsRepository,
  exportSavedObjectsToStream,
  importSavedObjectsFromStream,
  resolveSavedObjectsImportErrors,
} from '../../../core/server/saved_objects';
import { convertTypesToLegacySchema } from '../../../core/server/saved_objects/utils';

export function savedObjectsMixin(kbnServer, server) {
  const migrator = kbnServer.newPlatform.__internals.kibanaMigrator;
  const typeRegistry = kbnServer.newPlatform.start.core.savedObjects.getTypeRegistry();
  const mappings = migrator.getActiveMappings();
  const allTypes = typeRegistry.getAllTypes().map((t) => t.name);
  const visibleTypes = typeRegistry.getVisibleTypes().map((t) => t.name);
  const schema = new SavedObjectsSchema(convertTypesToLegacySchema(typeRegistry.getAllTypes()));

  server.decorate('server', 'kibanaMigrator', migrator);

  const warn = (message) => server.log(['warning', 'saved-objects'], message);
  // we use kibana.index which is technically defined in the kibana plugin, so if
  // we don't have the plugin (mainly tests) we can't initialize the saved objects
  if (!kbnServer.pluginSpecs.some((p) => p.getId() === 'kibana')) {
    warn('Saved Objects uninitialized because the Kibana plugin is disabled.');
    return;
  }

  const serializer = kbnServer.newPlatform.start.core.savedObjects.createSerializer();

  const createRepository = (callCluster, includedHiddenTypes = []) => {
    if (typeof callCluster !== 'function') {
      throw new TypeError('Repository requires a "callCluster" function to be provided.');
    }
    // throw an exception if an extraType is not defined.
    includedHiddenTypes.forEach((type) => {
      if (!allTypes.includes(type)) {
        throw new Error(`Missing mappings for saved objects type '${type}'`);
      }
    });
    const combinedTypes = visibleTypes.concat(includedHiddenTypes);
    const allowedTypes = [...new Set(combinedTypes)];

    const config = server.config();

    return new SavedObjectsRepository({
      index: config.get('kibana.index'),
      migrator,
      mappings,
      typeRegistry,
      serializer,
      allowedTypes,
      callCluster,
    });
  };

  const provider = kbnServer.newPlatform.__internals.savedObjectsClientProvider;

  const service = {
    types: visibleTypes,
    SavedObjectsClient,
    SavedObjectsRepository,
    getSavedObjectsRepository: createRepository,
    getScopedSavedObjectsClient: (...args) => provider.getClient(...args),
    setScopedSavedObjectsClientFactory: (...args) => provider.setClientFactory(...args),
    addScopedSavedObjectsClientWrapperFactory: (...args) =>
      provider.addClientWrapperFactory(...args),
    importExport: {
      objectLimit: server.config().get('savedObjects.maxImportExportSize'),
      importSavedObjects: importSavedObjectsFromStream,
      resolveImportErrors: resolveSavedObjectsImportErrors,
      getSortedObjectsForExport: exportSavedObjectsToStream,
    },
    schema,
  };
  server.decorate('server', 'savedObjects', service);

  const savedObjectsClientCache = new WeakMap();
  server.decorate('request', 'getSavedObjectsClient', function (options) {
    const request = this;

    if (savedObjectsClientCache.has(request)) {
      return savedObjectsClientCache.get(request);
    }

    const savedObjectsClient = server.savedObjects.getScopedSavedObjectsClient(request, options);

    savedObjectsClientCache.set(request, savedObjectsClient);
    return savedObjectsClient;
  });
}
