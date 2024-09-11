/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpServiceSetup, StartServicesAccessor } from '@kbn/core/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { routes } from './rest_api_routes/public';
import type { DataViewsServerPluginStart, DataViewsServerPluginStartDependencies } from './types';

import { registerExistingIndicesPath } from './rest_api_routes/internal/existing_indices';
import { registerFieldForWildcard } from './rest_api_routes/internal/fields_for';
import { registerHasDataViewsRoute } from './rest_api_routes/internal/has_data_views';
import { registerHasEsDataRoute } from './rest_api_routes/internal/has_es_data';
import { registerFields } from './rest_api_routes/internal/fields';

interface RegisterRoutesArgs {
  http: HttpServiceSetup;
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >;
  isRollupsEnabled: () => boolean;
  dataViewRestCounter?: UsageCounter;
}

export function registerRoutes({
  http,
  getStartServices,
  dataViewRestCounter,
  isRollupsEnabled,
}: RegisterRoutesArgs) {
  const router = http.createRouter();

  routes.forEach((route) => route(router, getStartServices, dataViewRestCounter));

  registerExistingIndicesPath(router);
  registerFieldForWildcard(router, getStartServices, isRollupsEnabled);
  registerFields(router, getStartServices, isRollupsEnabled);
  registerHasDataViewsRoute(router);
  registerHasEsDataRoute(router);
}
