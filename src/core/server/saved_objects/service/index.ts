/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
export {
  SavedObjectsErrorHelpers,
  SavedObjectsClientProvider,
  SavedObjectsUtils,
  AuditAction,
} from './lib';
export type {
  SavedObjectsRepository,
  ISavedObjectsEncryptionExtension,
  CheckAuthorizationParams,
  AuthorizationTypeEntry,
  AuthorizationTypeMap,
  CheckAuthorizationResult,
  EnforceAuthorizationParams,
  AddAuditEventParams,
  RedactNamespacesParams,
  ISavedObjectsSecurityExtension,
  SavedObjectsExtensions,
  ISavedObjectsPointInTimeFinder,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsCreatePointInTimeFinderDependencies,
  ISavedObjectsClientProvider,
  SavedObjectsClientProviderOptions,
  SavedObjectsClientWrapperFactory,
  SavedObjectsClientWrapperOptions,
  SavedObjectsClientFactory,
  SavedObjectsClientFactoryProvider,
  SavedObjectsEncryptionExtensionFactory,
  SavedObjectsSecurityExtensionFactory,
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
  SavedObjectReferenceWithContext,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateObjectsSpacesOptions,
  SavedObjectsUpdateObjectsSpacesResponse,
  SavedObjectsUpdateObjectsSpacesResponseObject,
} from './lib';

export * from './saved_objects_client';
