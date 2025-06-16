/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type {
  SavedObjectsNamespaceType,
  SavedObjectError,
  SavedObjectsMigrationVersion,
} from './saved_objects';

export type {
  SavedObject,
  SavedObjectAttributeSingle,
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectReference,
} from './server_types';

export type {
  SavedObjectsImportResponse,
  SavedObjectsImportSuccess,
  SavedObjectsImportFailure,
  SavedObjectsImportRetry,
  SavedObjectsImportWarning,
  SavedObjectsImportSimpleWarning,
  SavedObjectsImportAmbiguousConflictError,
  SavedObjectsImportUnsupportedTypeError,
  SavedObjectsImportMissingReferencesError,
  SavedObjectsImportUnknownError,
  SavedObjectsImportActionRequiredWarning,
  SavedObjectsImportConflictError,
} from './saved_objects_imports';

export type { SavedObjectTypeIdTuple, LegacyUrlAliasTarget } from './types';
