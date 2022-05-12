/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export * from './service';

export { SavedObjectsImporter } from './import';

export type {
  ISavedObjectsImporter,
  SavedObjectsImportAmbiguousConflictError,
  SavedObjectsImportConflictError,
  SavedObjectsImportFailure,
  SavedObjectsImportMissingReferencesError,
  SavedObjectsImportOptions,
  SavedObjectsImportResponse,
  SavedObjectsImportRetry,
  SavedObjectsImportSuccess,
  SavedObjectsImportUnknownError,
  SavedObjectsImportUnsupportedTypeError,
  SavedObjectsResolveImportErrorsOptions,
  SavedObjectsImportError,
  SavedObjectsImportHook,
  SavedObjectsImportHookResult,
  SavedObjectsImportSimpleWarning,
  SavedObjectsImportActionRequiredWarning,
  SavedObjectsImportWarning,
} from './import';

export type {
  SavedObjectsExporter,
  ISavedObjectsExporter,
  SavedObjectExportBaseOptions,
  SavedObjectsExportByTypeOptions,
  SavedObjectsExportByObjectOptions,
  SavedObjectsExportResultDetails,
  SavedObjectsExportError,
  SavedObjectsExportTransformContext,
  SavedObjectsExportTransform,
  SavedObjectsExportExcludedObject,
} from './export';

export { SavedObjectsSerializer } from './serialization';

export type {
  SavedObjectsRawDoc,
  SavedObjectsRawDocParseOptions,
  SavedObjectSanitizedDoc,
  SavedObjectUnsanitizedDoc,
} from './serialization';

export type { SavedObjectsMigrationLogger } from './migrations/core/migration_logger';

export { SavedObjectsService } from './saved_objects_service';

export type {
  InternalSavedObjectsServiceStart,
  SavedObjectsServiceStart,
  SavedObjectsServiceSetup,
  InternalSavedObjectsServiceSetup,
  SavedObjectsRepositoryFactory,
} from './saved_objects_service';

export type {
  ISavedObjectsRepository,
  SavedObjectsIncrementCounterOptions,
  SavedObjectsIncrementCounterField,
  SavedObjectsDeleteByNamespaceOptions,
} from './service/lib/repository';

export type {
  SavedObjectsFieldMapping,
  SavedObjectsMappingProperties,
  SavedObjectsTypeMappingDefinition,
  SavedObjectsTypeMappingDefinitions,
} from './mappings';

export type {
  SavedObjectMigrationMap,
  SavedObjectMigrationFn,
  SavedObjectMigrationContext,
} from './migrations';
export { mergeSavedObjectMigrationMaps } from './migrations';

export type {
  SavedObjectsNamespaceType,
  SavedObjectStatusMeta,
  SavedObjectsType,
  SavedObjectsTypeManagementDefinition,
  SavedObjectTypeExcludeFromUpgradeFilterHook,
} from './types';

export type { SavedObjectsValidationMap, SavedObjectsValidationSpec } from './validation';

export { savedObjectsConfig, savedObjectsMigrationConfig } from './saved_objects_config';
export { SavedObjectTypeRegistry } from './saved_objects_type_registry';
export type { ISavedObjectTypeRegistry } from './saved_objects_type_registry';
