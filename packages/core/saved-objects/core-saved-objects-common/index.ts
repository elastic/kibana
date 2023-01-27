/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  SavedObject,
  SavedObjectsNamespaceType,
  SavedObjectAttributeSingle,
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectError,
  SavedObjectReference,
  SavedObjectsMigrationVersion,
} from './src/saved_objects';

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
} from './src/saved_objects_imports';

export type { SavedObjectTypeIdTuple, LegacyUrlAliasTarget } from './src/types';

export {
  SavedObjectsErrorHelpers,
  type DecoratedError,
  type BulkResolveError,
} from './src/saved_objects_error_helpers';
