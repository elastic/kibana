/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** This module is intended for consumption by public to avoid import issues with server-side code */
export { PluginOpaqueId } from './plugins/types';
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
  SavedObjectError,
  SavedObjectReference,
  SavedObjectsMigrationVersion,
  SavedObjectStatusMeta,
  SavedObjectsFindOptionsReference,
  SavedObjectsFindOptions,
  SavedObjectsBaseOptions,
  MutatingOperationRefreshSetting,
  SavedObjectsClientContract,
  SavedObjectsNamespaceType,
} from './saved_objects/types';
export * from './ui_settings/types';
export * from './legacy/types';
export type { EnvironmentMode, PackageInfo } from '@kbn/config';
export type { ExternalUrlConfig, IExternalUrlPolicy } from './external_url';
