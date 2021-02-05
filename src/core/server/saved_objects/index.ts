/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export * from './service';

export {
  ISavedObjectsImporter,
  SavedObjectsImporter,
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

export {
  SavedObjectsExporter,
  ISavedObjectsExporter,
  SavedObjectExportBaseOptions,
  SavedObjectsExportByTypeOptions,
  SavedObjectsExportByObjectOptions,
  SavedObjectsExportResultDetails,
  SavedObjectsExportError,
  SavedObjectsExportTransformContext,
  SavedObjectsExportTransform,
} from './export';

export {
  SavedObjectsSerializer,
  SavedObjectsRawDoc,
  SavedObjectsRawDocParseOptions,
  SavedObjectSanitizedDoc,
  SavedObjectUnsanitizedDoc,
} from './serialization';

export { SavedObjectsMigrationLogger } from './migrations/core/migration_logger';

export {
  SavedObjectsService,
  InternalSavedObjectsServiceStart,
  SavedObjectsServiceStart,
  SavedObjectsServiceSetup,
  InternalSavedObjectsServiceSetup,
  SavedObjectsRepositoryFactory,
} from './saved_objects_service';

export {
  ISavedObjectsRepository,
  SavedObjectsIncrementCounterOptions,
  SavedObjectsIncrementCounterField,
  SavedObjectsDeleteByNamespaceOptions,
} from './service/lib/repository';

export {
  SavedObjectsCoreFieldMapping,
  SavedObjectsComplexFieldMapping,
  SavedObjectsFieldMapping,
  SavedObjectsMappingProperties,
  SavedObjectsTypeMappingDefinition,
  SavedObjectsTypeMappingDefinitions,
} from './mappings';

export {
  SavedObjectMigrationMap,
  SavedObjectMigrationFn,
  SavedObjectMigrationContext,
} from './migrations';

export {
  SavedObjectsNamespaceType,
  SavedObjectStatusMeta,
  SavedObjectsType,
  SavedObjectsTypeManagementDefinition,
} from './types';

export { savedObjectsConfig, savedObjectsMigrationConfig } from './saved_objects_config';
export { SavedObjectTypeRegistry, ISavedObjectTypeRegistry } from './saved_objects_type_registry';
