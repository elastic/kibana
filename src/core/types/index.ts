/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Use * syntax so that these exports do not break when internal
 * types are stripped.
 */
export * from './app_category';
export type { Capabilities } from '@kbn/core-capabilities-common';
export type {
  SavedObject,
  SavedObjectsNamespaceType,
  SavedObjectAttributeSingle,
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectError,
  SavedObjectReference,
  SavedObjectsMigrationVersion,
} from '@kbn/core-saved-objects-common';
export type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
export type {
  UiSettingsType,
  DeprecationSettings,
  UiSettingsParams,
  PublicUiSettingsParams,
  UserProvidedValues,
} from '@kbn/core-ui-settings-common';
