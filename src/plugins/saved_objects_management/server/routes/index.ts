/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpServiceSetup } from '@kbn/core/server';
import { ISavedObjectsManagement } from '../services';
import { registerBulkDeleteRoute } from './bulk_delete';
import { registerBulkGetRoute } from './bulk_get';
import { registerFindRoute } from './find';
import { registerGetAllowedTypesRoute } from './get_allowed_types';
import { registerRelationshipsRoute } from './relationships';
import { registerScrollForCountRoute } from './scroll_count';

interface RegisterRouteOptions {
  http: HttpServiceSetup;
  managementServicePromise: Promise<ISavedObjectsManagement>;
}

export function registerRoutes({ http, managementServicePromise }: RegisterRouteOptions) {
  const router = http.createRouter();
  registerFindRoute(router, managementServicePromise);
  registerBulkDeleteRoute(router);
  registerBulkGetRoute(router, managementServicePromise);
  registerScrollForCountRoute(router);
  registerRelationshipsRoute(router, managementServicePromise);
  registerGetAllowedTypesRoute(router);
}
