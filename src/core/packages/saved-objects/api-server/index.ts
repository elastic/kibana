/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { SavedObjectsClientContract } from './src/saved_objects_client';
export type {
  ISavedObjectsRepository,
  SavedObjectsFindInternalOptions,
} from './src/saved_objects_repository';
export type {
  MutatingOperationRefreshSetting,
  SavedObjectsBaseOptions,
  SavedObjectsIncrementCounterOptions,
  SavedObjectsDeleteByNamespaceOptions,
  SavedObjectsBulkResponse,
  SavedObjectsUpdateResponse,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkResolveObject,
  SavedObjectsIncrementCounterField,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkResolveResponse,
  SavedObjectsCreateOptions,
  SavedObjectsFindResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsUpdateObjectsSpacesResponse,
  SavedObjectsUpdateObjectsSpacesOptions,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
  SavedObjectsRemoveReferencesToResponse,
  SavedObjectsCheckConflictsObject,
  SavedObjectsCheckConflictsResponse,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsFindOptionsReference,
  SavedObjectsFindResult,
  SavedObjectsRemoveReferencesToOptions,
  SavedObjectsDeleteOptions,
  SavedObjectsOpenPointInTimeResponse,
  SavedObjectsBulkUpdateObject,
  SavedObjectsClosePointInTimeResponse,
  ISavedObjectsPointInTimeFinder,
  SavedObjectsCreatePointInTimeFinderDependencies,
  SavedObjectsPitParams,
  SavedObjectsResolveOptions,
  SavedObjectsResolveResponse,
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsUpdateObjectsSpacesResponseObject,
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectReferenceWithContext,
  SavedObjectsUpdateOptions,
  SavedObjectsOpenPointInTimeOptions,
  SavedObjectsClosePointInTimeOptions,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsFindOptions,
  SavedObjectsGetOptions,
  SavedObjectsPointInTimeFinderClient,
  SavedObjectsBulkDeleteObject,
  SavedObjectsBulkDeleteOptions,
  SavedObjectsBulkDeleteStatus,
  SavedObjectsBulkDeleteResponse,
  SavedObjectsChangeAccessControlOptions,
  SavedObjectsChangeAccessControlResponse,
  SavedObjectsChangeAccessControlObject,
  SavedObjectsChangeOwnershipOptions,
  SavedObjectsChangeAccessModeOptions,
  SavedObjectsSearchOptions,
  SavedObjectsSearchResponse,
  SavedObjectsEsqlOptions,
  SavedObjectsEsqlResponse,
} from './src/apis';

export { type Left, type Either, type Right, isLeft, isRight, left, right } from './src/utils';

export type {
  SavedObject,
  SavedObjectAccessControl,
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectAttributeSingle,
  SavedObjectReference,
  SavedObjectsRawDocSource,
} from '@kbn/core-saved-objects-common/src/server_types';

// --- Type registration types (moved from @kbn/core-saved-objects-server) ---

export type {
  SavedObjectsType,
  SavedObjectTypeExcludeFromUpgradeFilterHook,
  SavedObjectTypeVersionGuesser,
} from './src/saved_objects_type';
export type { ISavedObjectTypeRegistry } from './src/type_registry';
export type {
  SavedObjectsTypeMappingDefinition,
  SavedObjectsTypeMappingDefinitionSafe,
  SavedObjectsFieldMapping,
  SavedObjectsMappingProperties,
  SavedObjectsMappingPropertiesSafe,
  SavedObjectsFieldMappingSafe,
} from './src/mapping_definition';
export type { SavedObjectsValidationMap, SavedObjectsValidationSpec } from './src/validation';
export type {
  SavedObjectMigration,
  SavedObjectMigrationMap,
  SavedObjectMigrationContext,
  SavedObjectMigrationParams,
  SavedObjectsMigrationLogger,
  SavedObjectMigrationFn,
} from './src/migration_types';
export type {
  SavedObjectsTypeManagementDefinition,
  SavedObjectsExportablePredicate,
} from './src/saved_objects_management';
export type {
  SavedObjectsExportTransformContext,
  SavedObjectsExportTransform,
} from './src/export_transform';
export type { SavedObjectsImportHookResult, SavedObjectsImportHook } from './src/import_hook';
export type {
  SavedObjectDoc,
  SavedObjectUnsanitizedDoc,
  SavedObjectSanitizedDoc,
} from './src/saved_object_doc';
export type {
  ModelVersionIdentifier,
  SavedObjectsModelVersion,
  SavedObjectsModelVersionMap,
  SavedObjectsModelVersionMapProvider,
  SavedObjectsModelChange,
  SavedObjectsModelMappingsAdditionChange,
  SavedObjectsModelMappingsDeprecationChange,
  SavedObjectsModelDataBackfillChange,
  SavedObjectsModelDataRemovalChange,
  SavedObjectsModelUnsafeTransformChange,
  SavedObjectModelTransformationDoc,
  SavedObjectModelTransformationContext,
  SavedObjectModelTransformationFn,
  SavedObjectModelTransformationResult,
  SavedObjectModelDataBackfillFn,
  SavedObjectModelDataBackfillResult,
  SavedObjectModelUnsafeTransformFn,
  SavedObjectsModelVersionSchemaDefinitions,
  SavedObjectModelVersionForwardCompatibilityFn,
  SavedObjectModelVersionForwardCompatibilityObjectSchema,
  SavedObjectModelVersionForwardCompatibilitySchema,
  SavedObjectsFullModelVersion,
  SavedObjectsFullModelVersionSchemaDefinitions,
} from './src/model_version';
