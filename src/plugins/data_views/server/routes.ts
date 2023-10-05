/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpServiceSetup, StartServicesAccessor } from '@kbn/core/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { routes } from './rest_api_routes/public';
import type { DataViewsServerPluginStart, DataViewsServerPluginStartDependencies } from './types';

import { registerFieldForWildcard } from './rest_api_routes/internal/fields_for';
import { registerHasDataViewsRoute } from './rest_api_routes/internal/has_data_views';

export function registerRoutes(
  http: HttpServiceSetup,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >,
  isRollupsEnabled: () => boolean,
  dataViewRestCounter?: UsageCounter
) {
  const router = http.createRouter();

  routes.forEach((route) => route(router, getStartServices, dataViewRestCounter));

  registerFieldForWildcard(router, getStartServices, isRollupsEnabled);
  registerHasDataViewsRoute(router);
}
