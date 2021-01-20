/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export {
  SavedObjectsBatchResponse,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkCreateOptions,
  SavedObjectsBulkUpdateObject,
  SavedObjectsClient,
  SavedObjectsClientContract,
  SavedObjectsCreateOptions,
  SavedObjectsFindResponsePublic,
  SavedObjectsUpdateOptions,
  SavedObjectsBulkUpdateOptions,
} from './saved_objects_client';
export { SimpleSavedObject } from './simple_saved_object';
export { SavedObjectsStart, SavedObjectsService } from './saved_objects_service';
export {
  SavedObjectsBaseOptions,
  SavedObjectsFindOptions,
  SavedObjectsFindOptionsReference,
  SavedObjectsMigrationVersion,
  SavedObjectsImportResponse,
  SavedObjectsImportSuccess,
  SavedObjectsImportConflictError,
  SavedObjectsImportAmbiguousConflictError,
  SavedObjectsImportUnsupportedTypeError,
  SavedObjectsImportMissingReferencesError,
  SavedObjectsImportUnknownError,
  SavedObjectsImportFailure,
  SavedObjectsImportRetry,
  SavedObjectsNamespaceType,
} from '../../server/types';

export {
  SavedObject,
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectAttributeSingle,
  SavedObjectError,
  SavedObjectReference,
} from '../../types';
