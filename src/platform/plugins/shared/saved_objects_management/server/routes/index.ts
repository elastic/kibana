/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpServiceSetup } from '@kbn/core/server';
import { ISavedObjectsManagement } from '../services';
import { registerFindRoute } from './find';
import { registerBulkDeleteRoute } from './bulk_delete';
import { registerBulkGetRoute } from './bulk_get';
import { registerScrollForCountRoute } from './scroll_count';
import { registerRelationshipsRoute } from './relationships';
import { registerGetAllowedTypesRoute } from './get_allowed_types';

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
