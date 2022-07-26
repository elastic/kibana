/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export * from './service';

export { SavedObjectsImporter } from './import';

export type { SavedObjectsImportError } from './import';

export type { SavedObjectsExporter, SavedObjectsExportError } from './export';

export { SavedObjectsSerializer } from './serialization';

export { SavedObjectsService } from './saved_objects_service';

export type {
  InternalSavedObjectsServiceStart,
  InternalSavedObjectsServiceSetup,
} from './saved_objects_service';

export type { SavedObjectsTypeMappingDefinitions } from './mappings';

export { mergeSavedObjectMigrationMaps } from './migrations';

export { savedObjectsConfig, savedObjectsMigrationConfig } from './saved_objects_config';
export { SavedObjectTypeRegistry } from './saved_objects_type_registry';
export { CoreSavedObjectsRouteHandlerContext } from './saved_objects_route_handler_context';
export type { SavedObjectsRequestHandlerContext } from './saved_objects_route_handler_context';
