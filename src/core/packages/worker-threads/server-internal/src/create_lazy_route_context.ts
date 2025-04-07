/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'lodash';
import { Observable, lastValueFrom } from 'rxjs';
import { InternalSavedObjectsServiceStart } from '@kbn/core-saved-objects-server-internal';
import { InternalElasticsearchServiceStart } from '@kbn/core-elasticsearch-server-internal';
import { InternalUiSettingsServiceStart } from '@kbn/core-ui-settings-server-internal';
import { KibanaRequest } from '@kbn/core-http-server';
import { RouteWorkerCoreRequestContext } from '@kbn/core-worker-threads-server/src/types';

export function createLazyRouteContext({
  request,
  elasticsearchStart$,
  savedObjectsStart$,
  uiSettingsStart$,
}: {
  request: KibanaRequest;
  elasticsearchStart$: Observable<InternalElasticsearchServiceStart>;
  savedObjectsStart$: Observable<InternalSavedObjectsServiceStart>;
  uiSettingsStart$: Observable<InternalUiSettingsServiceStart>;
}): RouteWorkerCoreRequestContext {
  const getElasticsearchRouteHandlerContext = once(async () => {
    const [{ CoreElasticsearchRouteHandlerContext }, elasticsearchStart] = await Promise.all([
      import('@kbn/core-elasticsearch-server-internal/src/elasticsearch_route_handler_context'),
      lastValueFrom(elasticsearchStart$),
    ]);

    return new CoreElasticsearchRouteHandlerContext(elasticsearchStart, request);
  });

  const getSavedObjectsRouteHandlerContext = once(async () => {
    const [{ CoreSavedObjectsRouteHandlerContext }, savedObjectsStart] = await Promise.all([
      import('@kbn/core-saved-objects-server-internal/src/saved_objects_route_handler_context'),
      lastValueFrom(savedObjectsStart$),
    ]);

    return new CoreSavedObjectsRouteHandlerContext(savedObjectsStart, request);
  });

  const getUiSettingsRouteHandlerContext = once(async () => {
    const [
      { CoreUiSettingsRouteHandlerContext },
      uiSettingsStart,
      savedObjectsRouteHandlerContext,
    ] = await Promise.all([
      import('@kbn/core-ui-settings-server-internal/src/ui_settings_route_handler_context'),
      lastValueFrom(uiSettingsStart$),
      getSavedObjectsRouteHandlerContext(),
    ]);

    return new CoreUiSettingsRouteHandlerContext(uiSettingsStart, savedObjectsRouteHandlerContext);
  });

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
