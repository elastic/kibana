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
import { SavedObjectsSerializer } from '../../../core/server/saved_objects/serialization';
import {
  SavedObjectsClient,
  SavedObjectsRepository,
  getSortedObjectsForExport,
  importSavedObjects,
  resolveImportErrors,
} from '../../../core/server/saved_objects';
import { getRootPropertiesObjects } from '../../../core/server/saved_objects/mappings';
import { SavedObjectsManagement } from '../../../core/server/saved_objects/management';

import {
  createBulkCreateRoute,
  createBulkGetRoute,
  createCreateRoute,
  createDeleteRoute,
  createFindRoute,
  createGetRoute,
  createUpdateRoute,
  createBulkUpdateRoute,
  createExportRoute,
  createImportRoute,
  createResolveImportErrorsRoute,
  createLogLegacyImportRoute,
} from './routes';

function getImportableAndExportableTypes({ kbnServer, visibleTypes }) {
  const { savedObjectsManagement = {} } = kbnServer.uiExports;
  return visibleTypes.filter(
    type =>
      savedObjectsManagement[type] &&
      savedObjectsManagement[type].isImportableAndExportable === true
  );
}

export function savedObjectsMixin(kbnServer, server) {
  const migrator = kbnServer.newPlatform.__internals.kibanaMigrator;
  const mappings = migrator.getActiveMappings();
  const allTypes = Object.keys(getRootPropertiesObjects(mappings));
  const schema = new SavedObjectsSchema(kbnServer.uiExports.savedObjectSchemas);
  const visibleTypes = allTypes.filter(type => !schema.isHiddenType(type));
  const importableAndExportableTypes = getImportableAndExportableTypes({ kbnServer, visibleTypes });

  server.decorate('server', 'kibanaMigrator', migrator);
  server.decorate(
    'server',
    'getSavedObjectsManagement',
    () => new SavedObjectsManagement(kbnServer.uiExports.savedObjectsManagement)
  );

  const warn = message => server.log(['warning', 'saved-objects'], message);
  // we use kibana.index which is technically defined in the kibana plugin, so if
  // we don't have the plugin (mainly tests) we can't initialize the saved objects
  if (!kbnServer.pluginSpecs.some(p => p.getId() === 'kibana')) {
    warn('Saved Objects uninitialized because the Kibana plugin is disabled.');
    return;
  }

  const prereqs = {
    getSavedObjectsClient: {
      assign: 'savedObjectsClient',
      method(req) {
        return req.getSavedObjectsClient();
      },
    },
  };
  server.route(createBulkCreateRoute(prereqs));
  server.route(createBulkGetRoute(prereqs));
  server.route(createBulkUpdateRoute(prereqs));
  server.route(createCreateRoute(prereqs));
  server.route(createDeleteRoute(prereqs));
  server.route(createFindRoute(prereqs));
  server.route(createGetRoute(prereqs));
  server.route(createUpdateRoute(prereqs));
  server.route(createExportRoute(prereqs, server, importableAndExportableTypes));
  server.route(createImportRoute(prereqs, server, importableAndExportableTypes));
  server.route(createResolveImportErrorsRoute(prereqs, server, importableAndExportableTypes));
  server.route(createLogLegacyImportRoute());

  const serializer = new SavedObjectsSerializer(schema);

  const createRepository = (callCluster, extraTypes = []) => {
    if (typeof callCluster !== 'function') {
      throw new TypeError('Repository requires a "callCluster" function to be provided.');
    }
    // throw an exception if an extraType is not defined.
    extraTypes.forEach(type => {
      if (!allTypes.includes(type)) {
        throw new Error(`Missing mappings for saved objects type '${type}'`);
      }
    });
    const combinedTypes = visibleTypes.concat(extraTypes);
    const allowedTypes = [...new Set(combinedTypes)];

    const config = server.config();

    return new SavedObjectsRepository({
      index: config.get('kibana.index'),
      config,
      migrator,
      mappings,
      schema,
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
      importSavedObjects,
      resolveImportErrors,
      getSortedObjectsForExport,
    },
    schema,
  };
  server.decorate('server', 'savedObjects', service);

  const savedObjectsClientCache = new WeakMap();
  server.decorate('request', 'getSavedObjectsClient', function(options) {
    const request = this;

    if (savedObjectsClientCache.has(request)) {
      return savedObjectsClientCache.get(request);
    }

    const savedObjectsClient = server.savedObjects.getScopedSavedObjectsClient(request, options);

    savedObjectsClientCache.set(request, savedObjectsClient);
    return savedObjectsClient;
  });
}
