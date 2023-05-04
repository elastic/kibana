/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpServiceSetup, StartServicesAccessor } from '@kbn/core/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { routes } from './rest_api_routes';
import type { DataViewsServerPluginStart, DataViewsServerPluginStartDependencies } from './types';

import { registerFieldForWildcard } from './routes/fields_for';
import { registerHasDataViewsRoute } from './routes/has_data_views';

export function registerRoutes(
  http: HttpServiceSetup,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >,
  dataViewRestCounter?: UsageCounter
) {
  const router = http.createRouter();

  routes.forEach((route) => route(router, getStartServices, dataViewRestCounter));

  registerFieldForWildcard(router, getStartServices);
  registerHasDataViewsRoute(router);
}
