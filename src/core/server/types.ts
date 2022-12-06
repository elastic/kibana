/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** This module is intended for consumption by public to avoid import issues with server-side code */
export type { EnvironmentMode, PackageInfo } from '@kbn/config';
export type { PluginOpaqueId } from '@kbn/core-base-common';
export type {
  SavedObjectsImportResponse,
  SavedObjectsImportSuccess,
  SavedObjectsImportConflictError,
  SavedObjectsImportAmbiguousConflictError,
  SavedObjectsImportUnsupportedTypeError,
  SavedObjectsImportMissingReferencesError,
  SavedObjectsImportUnknownError,
  SavedObjectsImportFailure,
  SavedObjectsImportRetry,
  SavedObjectsImportWarning,
  SavedObjectsImportActionRequiredWarning,
  SavedObjectsImportSimpleWarning,
  SavedObjectAttributes,
  SavedObjectAttribute,
  SavedObjectAttributeSingle,
  SavedObject,
  SavedObjectsNamespaceType,
  SavedObjectError,
  SavedObjectReference,
  SavedObjectsMigrationVersion,
} from '@kbn/core-saved-objects-common';
export type {
  SavedObjectsFindOptionsReference,
  SavedObjectsFindOptions,
  SavedObjectsPitParams,
  SavedObjectsBaseOptions,
  MutatingOperationRefreshSetting,
  SavedObjectsClientContract,
  SavedObjectReferenceWithContext,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
} from '@kbn/core-saved-objects-api-server';
export type {
  DomainDeprecationDetails,
  DeprecationsGetResponse,
} from '@kbn/core-deprecations-common';
export type { ExternalUrlConfig } from '@kbn/core-http-server-internal';
export type { SavedObjectStatusMeta } from '@kbn/core-saved-objects-server';
export type {
  UiSettingsParams,
  PublicUiSettingsParams,
  UiSettingsType,
  UserProvidedValues,
  DeprecationSettings,
} from '@kbn/core-ui-settings-common';
export type {
  IUiSettingsClient,
  UiSettingsServiceSetup,
  UiSettingsServiceStart,
  UiSettingsRequestHandlerContext,
} from '@kbn/core-ui-settings-server';
