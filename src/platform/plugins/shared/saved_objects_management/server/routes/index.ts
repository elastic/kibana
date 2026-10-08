/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Maximum allowed saved object types in API requests. Currently 149 types registered
// (see SAVED_OBJECT_TYPES_COUNT in src/core/packages/saved-objects/server-internal/src/object_types/index.ts).
// Set to 200 to accommodate current types plus headroom for future growth.
export const SAVED_OBJECT_TYPES_MAX_SIZE = 200 as const;

export { BulkDeleteRoute } from './bulk_delete';
export { BulkGetRoute } from './bulk_get';
export { FindRoute } from './find';
export { GetAllowedTypesRoute } from './get_allowed_types';
export { RelationshipsRoute } from './relationships';
export { ScrollCountRoute } from './scroll_count';
