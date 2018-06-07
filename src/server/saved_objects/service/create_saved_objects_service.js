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
import { getKibanaIndexMigrator } from '../../utils';

export function createSavedObjectsService(kbnServer, server) {
  // getKibanaIndexMigrator could fail (e.g. if elasticsearch is unavailable)
  // but we don't want to create a new migrator with every call, as it's relatively
  // expensive, so we'll cache the first successful instance.
  const getMigrator = (() => {
    let migrator;
    return async () => migrator || await getKibanaIndexMigrator();
  });
  const onBeforeWrite = async () => {
    try {
      const migrator = await getMigrator();
      await migrator.putTemplate();
    } catch (error) {
      server.log(['debug', 'savedObjects'], {
        tmpl:
          'Attempt to write indexTemplate for SavedObjects index failed: <%= err.message %>',
        es: {
          resp: error.body,
          status: error.status,
        },
        err: {
          message: error.message,
          stack: error.stack,
        },
      });

      // We reject with `es.ServiceUnavailable` because writing an index
      // template is a very simple operation so if we get an error here
      // then something must be very broken
      const adminCluster = server.plugins.elasticsearch.getCluster('admin');
      throw new adminCluster.errors.ServiceUnavailable();
    }
  };

  const scopedClientProvider = new ScopedSavedObjectsClientProvider({
    index: server.config().get('kibana.index'),
    mappings: server.getKibanaIndexMappingsDsl(),
    onBeforeWrite,
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
        onBeforeWrite,
        callCluster
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
