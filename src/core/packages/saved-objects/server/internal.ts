/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { MIGRATION_CLIENT_OPTIONS, REMOVED_TYPES } from './src/server_internal/constants';
export { SavedObjectsService } from './src/server_internal/saved_objects_service';
export type {
  InternalSavedObjectsServiceStart,
  InternalSavedObjectsServiceSetup,
} from './src/server_internal/saved_objects_service';
export { CoreSavedObjectsRouteHandlerContext } from './src/server_internal/saved_objects_route_handler_context';
export type {
  InternalSavedObjectsRequestHandlerContext,
  InternalSavedObjectRouter,
} from './src/server_internal/internal_types';
export { SAVED_OBJECT_TYPES_COUNT } from './src/server_internal/object_types';

// only used by integration tests
export { registerDeleteUnknownTypesRoute } from './src/server_internal/routes/deprecations';
export { registerBulkCreateRoute } from './src/server_internal/routes/bulk_create';
export { registerBulkGetRoute } from './src/server_internal/routes/bulk_get';
export { registerBulkResolveRoute } from './src/server_internal/routes/bulk_resolve';
export { registerBulkUpdateRoute } from './src/server_internal/routes/bulk_update';
export { registerBulkDeleteRoute } from './src/server_internal/routes/bulk_delete';
export { registerCreateRoute } from './src/server_internal/routes/create';
export { registerDeleteRoute } from './src/server_internal/routes/delete';
export { registerExportRoute } from './src/server_internal/routes/export';
export { registerFindRoute } from './src/server_internal/routes/find';
export { registerGetRoute } from './src/server_internal/routes/get';
export { registerImportRoute } from './src/server_internal/routes/import';
export { registerMigrateRoute } from './src/server_internal/routes/migrate';
export { registerResolveRoute } from './src/server_internal/routes/resolve';
export { registerResolveImportErrorsRoute } from './src/server_internal/routes/resolve_import_errors';
export { registerUpdateRoute } from './src/server_internal/routes/update';
