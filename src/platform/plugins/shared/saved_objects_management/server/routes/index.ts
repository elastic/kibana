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
import { registerGetAllowedTypesRoute } from './get_allowed_types';

// Maximum allowed saved object types in API requests. Currently 149 types registered
// (see SAVED_OBJECT_TYPES_COUNT in src/core/packages/saved-objects/server-internal/src/object_types/index.ts).
// Set to 200 to accommodate current types plus headroom for future growth.
export const SAVED_OBJECT_TYPES_MAX_SIZE = 200 as const;

interface RegisterRouteOptions {
  http: HttpServiceSetup;
  managementServicePromise: Promise<ISavedObjectsManagement>;
}

export function registerRoutes({ http, managementServicePromise }: RegisterRouteOptions) {
  const router = http.createRouter();
  registerFindRoute(router, managementServicePromise);
  registerBulkGetRoute(router, managementServicePromise);
  registerRelationshipsRoute(router, managementServicePromise);
  registerGetAllowedTypesRoute(router);
}

export { BulkDeleteRoute } from './bulk_delete';
export { ScrollCountRoute } from './scroll_count';
