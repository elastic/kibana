/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpServiceSetup } from '@kbn/core/server';
import type { ISavedObjectsManagement } from '../services';
import { registerFindRoute } from './find';
import { registerBulkGetRoute } from './bulk_get';
import { registerRelationshipsRoute } from './relationships';

interface RegisterRouteOptions {
  http: HttpServiceSetup;
  managementServicePromise: Promise<ISavedObjectsManagement>;
}

export function registerRoutes({ http, managementServicePromise }: RegisterRouteOptions) {
  const router = http.createRouter();
  registerFindRoute(router, managementServicePromise);
  registerBulkGetRoute(router, managementServicePromise);
  registerRelationshipsRoute(router, managementServicePromise);
}

export { BulkDeleteRoute } from './bulk_delete';
export { GetAllowedTypesRoute } from './get_allowed_types';
export { ScrollCountRoute } from './scroll_count';
