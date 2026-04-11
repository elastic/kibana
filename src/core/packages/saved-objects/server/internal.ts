/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// --- server-internal ---
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

// --- import/export internals (previously @kbn/core-saved-objects-import-export-server) ---
export { SavedObjectsImporter, SavedObjectsImportError } from './src/import_export/import';
export {
  SavedObjectsExporter,
  SavedObjectsExportError,
  EXPORT_ALL_TYPES_TOKEN,
} from './src/import_export/export';

// --- base-internal (previously @kbn/core-saved-objects-base-server-internal) ---
export { DEFAULT_INDEX_TYPES_MAP, HASH_TO_VERSION_MAP } from './src/base_internal/constants';
export { LEGACY_URL_ALIAS_TYPE, type LegacyUrlAlias } from './src/base_internal/legacy_alias';
export {
  getProperty,
  getRootProperties,
  getRootPropertiesObjects,
  getTypes,
  type IndexMapping,
  type IndexMappingSafe,
  type IndexMappingMeta,
  type IndexTypesMap,
  type SavedObjectsTypeMappingDefinitions,
  type IndexMappingMigrationStateMeta,
} from './src/base_internal/mappings';
export { SavedObjectsSerializer } from './src/base_internal/serialization';
export { SavedObjectsTypeValidator } from './src/base_internal/validation';
export {
  decodeRequestVersion,
  decodeVersion,
  encodeVersion,
  encodeHitVersion,
} from './src/base_internal/version';
export {
  savedObjectsConfig,
  savedObjectsMigrationConfig,
  SavedObjectConfig,
  type SavedObjectsConfigType,
  type SavedObjectsMigrationConfigType,
} from './src/base_internal/saved_objects_config';
export type { ISavedObjectTypeRegistryInternal } from './src/base_internal/saved_objects_type_registry';
export { SavedObjectTypeRegistry } from './src/base_internal/saved_objects_type_registry';
export type {
  IKibanaMigrator,
  KibanaMigratorStatus,
  MigrationResult,
  MigrationStatus,
  MigrateDocumentOptions,
  IDocumentMigrator,
  DocumentMigrateOptions,
  IsDowngradeRequiredOptions,
} from './src/base_internal/migration';
export {
  parseObjectKey,
  getObjectKey,
  getIndexForType,
  getFieldListFromTypeMapping,
  getFieldListMapFromMappingDefinitions,
  type FieldListMap,
} from './src/base_internal/utils';
export {
  modelVersionVirtualMajor,
  initialModelVersion,
  globalSwitchToModelVersionAt,
  assertValidModelVersion,
  isVirtualModelVersion,
  virtualVersionToModelVersion,
  modelVersionToVirtualVersion,
  getModelVersionMapForTypes,
  getLatestModelVersion,
  getCurrentVirtualVersion,
  getVirtualVersionMap,
  getLatestMappingsVirtualVersionMap,
  type ModelVersionMap,
  type VirtualVersionMap,
  compareVirtualVersions,
  type CompareModelVersionMapParams,
  type CompareModelVersionStatus,
  type CompareModelVersionDetails,
  type CompareModelVersionResult,
  getVirtualVersionsFromMappings,
  getVirtualVersionsFromMappingMeta,
  getModelVersionDelta,
  buildModelVersionTransformFn,
  aggregateMappingAdditions,
  convertModelVersionBackwardConversionSchema,
  getVersionAddedMappings,
  getVersionAddedFields,
} from './src/base_internal/model_version';

// --- api-internal (previously @kbn/core-saved-objects-api-server-internal) ---
export { SavedObjectsClient } from './src/api_internal/saved_objects_client';
export {
  SavedObjectsClientProvider,
  SavedObjectsRepository,
  PointInTimeFinder,
} from './src/api_internal/lib';
export type { ISavedObjectsClientProvider } from './src/api_internal/lib';

// --- migration-internal (previously @kbn/core-saved-objects-migration-server-internal) ---
export {
  DocumentMigrator,
  KibanaMigrator,
  buildActiveMappings,
  buildTypesMappings,
} from './src/migration_internal';
export type { KibanaMigratorOptions } from './src/migration_internal';
export { getAggregatedTypesDocuments } from './src/migration_internal/actions/check_for_unknown_docs';
export {
  addExcludedTypesToBoolQuery,
  createBulkIndexOperationTuple,
  createBulkDeleteOperationBody,
} from './src/migration_internal/model/helpers';

// these are only used for integration tests
export {
  bulkOverwriteTransformedDocuments,
  closePit,
  createIndex,
  openPit,
  calculateExcludeFilters,
  checkForUnknownDocs,
  waitForIndexStatus,
  cloneIndex,
  waitForTask,
  updateAndPickupMappings,
  updateMappings,
  updateAliases,
  transformDocs,
  setWriteBlock,
  removeWriteBlock,
  reindex,
  readWithPit,
  refreshIndex,
  pickupUpdatedMappings,
  fetchIndices,
  waitForReindexTask,
  waitForPickupUpdatedMappingsTask,
  checkClusterRoutingAllocationEnabled,
} from './src/migration_internal/actions';
export type {
  OpenPitResponse,
  ReadWithPit,
  ReindexResponse,
  UpdateByQueryResponse,
  UpdateAndPickupMappingsResponse,
  EsResponseTooLargeError,
} from './src/migration_internal/actions';
export {
  isClusterShardLimitExceeded,
  isIncompatibleMappingException,
  isWriteBlockException,
  isIndexNotFoundException,
} from './src/migration_internal/actions/es_errors';
export {
  deterministicallyRegenerateObjectId,
  type DocumentsTransformFailed,
  type DocumentsTransformSuccess,
} from './src/migration_internal/core';
