/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RouteWorkerCoreRequestContext } from '@kbn/core-worker-threads-server/src/types';
import { KibanaRequest } from '@kbn/core-http-server';
import { Observable, lastValueFrom } from 'rxjs';
import { InternalElasticsearchServiceStart } from '@kbn/core-elasticsearch-server-internal';
import { InternalUiSettingsServiceStart } from '@kbn/core-ui-settings-server-internal';
import { once } from 'lodash';
import { MessagePort } from 'worker_threads';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { InternalSavedObjectsServiceStart } from '@kbn/core-saved-objects-server-internal';
import { Logger } from '@kbn/logging';

function createRequestContext({
  request,
  elasticsearchStart$,
  uiSettingsStart$,
  getSavedObjectsClientFactory,
}: {
  request: KibanaRequest;
  elasticsearchStart$: Observable<InternalElasticsearchServiceStart>;
  uiSettingsStart$: Observable<InternalUiSettingsServiceStart>;
  getSavedObjectsClientFactory: () => Promise<() => SavedObjectsClientContract>;
}) {
  const getElasticsearchRouteHandlerContext = once(async () => {
    const [{ CoreElasticsearchRouteHandlerContext }, elasticsearchStart] = await Promise.all([
      import('@kbn/core-elasticsearch-server-internal/src/elasticsearch_route_handler_context'),
      lastValueFrom(elasticsearchStart$),
    ]);

    return new CoreElasticsearchRouteHandlerContext(elasticsearchStart, request);
  });

  const getSavedObjectsRouteHandlerContext = once(
    async (): RouteWorkerCoreRequestContext['savedObjects'] => {
      const createClient = await getSavedObjectsClientFactory();

      let client: SavedObjectsClientContract | undefined;

      return {
        get client() {
          if (!client) {
            client = createClient();
          }
          return client!;
        },
      };
    }
  );

  const getUiSettingsRouteHandlerContext = once(
    async (): RouteWorkerCoreRequestContext['uiSettings'] => {
      const [{ client: savedObjectsClient }, uiSettingsStart] = await Promise.all([
        getSavedObjectsRouteHandlerContext(),
        lastValueFrom(uiSettingsStart$),
      ]);

      return {
        get client() {
          return uiSettingsStart.asScopedToClient(savedObjectsClient);
        },
      };
    }
  );

  return {
    get elasticsearch() {
      return getElasticsearchRouteHandlerContext();
    },
    get savedObjects() {
      return getSavedObjectsRouteHandlerContext();
    },
    get uiSettings() {
      return getUiSettingsRouteHandlerContext();
    },
  };
}

export function createMainThreadRequestContext({
  request,
  elasticsearchStart$,
  savedObjectsStart$,
  uiSettingsStart$,
}: {
  request: KibanaRequest;
  elasticsearchStart$: Observable<InternalElasticsearchServiceStart>;
  uiSettingsStart$: Observable<InternalUiSettingsServiceStart>;
  savedObjectsStart$: Observable<InternalSavedObjectsServiceStart>;
}): RouteWorkerCoreRequestContext {
  return createRequestContext({
    request,
    elasticsearchStart$,
    uiSettingsStart$,
    getSavedObjectsClientFactory: async () => {
      const savedObjects = await lastValueFrom(savedObjectsStart$);
      return () => {
        return savedObjects.getScopedClient(request);
      };
    },
  });
}

export function createWorkerThreadRequestContext({
  request,
  elasticsearchStart$,
  uiSettingsStart$,
  savedObjects,
  logger,
}: {
  request: KibanaRequest;
  elasticsearchStart$: Observable<InternalElasticsearchServiceStart>;
  uiSettingsStart$: Observable<InternalUiSettingsServiceStart>;
  savedObjects: {
    port: MessagePort;
    namespace: string | undefined;
  };
  logger: Logger;
}): RouteWorkerCoreRequestContext {
  return createRequestContext({
    request,
    elasticsearchStart$,
    uiSettingsStart$,
    getSavedObjectsClientFactory: async () => {
      const { WorkerThreadsSavedObjectsClient } = await import('./rpc/saved_objects/client');
      return () => {
        return WorkerThreadsSavedObjectsClient(
          savedObjects.port,
          {
            namespace: savedObjects.namespace,
          },
          logger
        );
      };
    },
  });
}
