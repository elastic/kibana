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
  SavedObjectsRepositoryFactory,
  SavedObjectsClientProviderOptions,
  SavedObjectsEncryptionExtensionFactory,
  SavedObjectsSecurityExtensionFactory,
  SavedObjectsSpacesExtensionFactory,
  SavedObjectsExtensionFactory,
} from './src/client_factory';
export type { SavedObjectsServiceSetup, SavedObjectsServiceStart } from './src/contracts';
export type {
  ISavedObjectsExporter,
  SavedObjectsExportTransform,
  SavedObjectsExportByObjectOptions,
  SavedObjectsExportByTypeOptions,
  SavedObjectExportBaseOptions,
  SavedObjectsExportExcludedObject,
  SavedObjectsExportTransformContext,
  SavedObjectsExportResultDetails,
} from './src/export';
export type {
  ISavedObjectsImporter,
  SavedObjectsImportHook,
  SavedObjectsImportHookResult,
  SavedObjectsImportOptions,
  SavedObjectsResolveImportErrorsOptions,
  CreatedObject,
} from './src/import';
export type {
  SavedObjectsTypeMappingDefinition,
  SavedObjectsFieldMapping,
  SavedObjectsMappingProperties,
} from './src/mapping_definition';
export type {
  SavedObjectMigrationMap,
  SavedObjectMigrationContext,
  SavedObjectsMigrationLogger,
  SavedObjectMigrationFn,
} from './src/migration';
export type { SavedObjectsRequestHandlerContext } from './src/request_handler_context';
export type {
  SavedObjectsTypeManagementDefinition,
  SavedObjectsExportablePredicate,
} from './src/saved_objects_management';
export type { SavedObjectStatusMeta } from './src/saved_objects_status';
export type {
  SavedObjectsType,
  SavedObjectTypeExcludeFromUpgradeFilterHook,
} from './src/saved_objects_type';
export type {
  ISavedObjectsSerializer,
  SavedObjectsRawDocSource,
  SavedObjectsRawDoc,
  SavedObjectSanitizedDoc,
  SavedObjectsRawDocParseOptions,
  SavedObjectUnsanitizedDoc,
} from './src/serialization';
export type { ISavedObjectTypeRegistry } from './src/type_registry';
export type { SavedObjectsValidationMap, SavedObjectsValidationSpec } from './src/validation';
export type {
  ISavedObjectsEncryptionExtension,
  EncryptedObjectDescriptor,
} from './src/extensions/encryption';
export type {
  CheckAuthorizationParams,
  PerformAuthorizationParams,
  AuthorizationTypeEntry,
  AuthorizationTypeMap,
  CheckAuthorizationResult,
  EnforceAuthorizationParams,
  AddAuditEventParams,
  RedactNamespacesParams,
  ISavedObjectsSecurityExtension,
} from './src/extensions/security';
export { AuditAction } from './src/extensions/security';
export type { ISavedObjectsSpacesExtension } from './src/extensions/spaces';
export type { SavedObjectsExtensions } from './src/extensions/extensions';
export {
  ENCRYPTION_EXTENSION_ID,
  SECURITY_EXTENSION_ID,
  SPACES_EXTENSION_ID,
} from './src/extensions/extensions';
