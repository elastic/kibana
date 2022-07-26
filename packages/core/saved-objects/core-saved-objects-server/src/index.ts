/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  SavedObjectsClientFactory,
  SavedObjectsClientFactoryProvider,
  SavedObjectsClientWrapperFactory,
  SavedObjectsRepositoryFactory,
  SavedObjectsClientProviderOptions,
  SavedObjectsClientWrapperOptions,
} from './client_factory';
export type { SavedObjectsServiceSetup, SavedObjectsServiceStart } from './contracts';
export type {
  ISavedObjectsExporter,
  SavedObjectsExportTransform,
  SavedObjectsExportByObjectOptions,
  SavedObjectsExportByTypeOptions,
  SavedObjectExportBaseOptions,
  SavedObjectsExportExcludedObject,
  SavedObjectsExportTransformContext,
  SavedObjectsExportResultDetails,
} from './export';
export type {
  ISavedObjectsImporter,
  SavedObjectsImportHook,
  SavedObjectsImportHookResult,
  SavedObjectsImportOptions,
  SavedObjectsResolveImportErrorsOptions,
  CreatedObject,
} from './import';
export type {
  SavedObjectsTypeMappingDefinition,
  SavedObjectsFieldMapping,
  SavedObjectsMappingProperties,
} from './mapping_definition';
export type {
  SavedObjectMigrationMap,
  SavedObjectMigrationContext,
  SavedObjectsMigrationLogger,
  SavedObjectMigrationFn,
} from './migration';
export type {
  SavedObjectsTypeManagementDefinition,
  SavedObjectsExportablePredicate,
} from './saved_objects_management';
export type { SavedObjectStatusMeta } from './saved_objects_status';
export type {
  SavedObjectsType,
  SavedObjectTypeExcludeFromUpgradeFilterHook,
} from './saved_objects_type';
export type {
  ISavedObjectsSerializer,
  SavedObjectsRawDocSource,
  SavedObjectsRawDoc,
  SavedObjectSanitizedDoc,
  SavedObjectsRawDocParseOptions,
  SavedObjectUnsanitizedDoc,
} from './serialization';
export type { ISavedObjectTypeRegistry } from './type_registry';
export type { SavedObjectsValidationMap, SavedObjectsValidationSpec } from './validation';
