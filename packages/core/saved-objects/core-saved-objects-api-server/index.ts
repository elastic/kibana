/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { SavedObjectsClientContract } from './src/saved_objects_client';
export type {
  ISavedObjectsRepository,
  SavedObjectsFindInternalOptions,
} from './src/saved_objects_repository';
export type {
  MutatingOperationRefreshSetting,
  SavedObjectsBaseOptions,
  SavedObjectsIncrementCounterOptions,
  SavedObjectsDeleteByNamespaceOptions,
  SavedObjectsBulkResponse,
  SavedObjectsUpdateResponse,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkResolveObject,
  SavedObjectsIncrementCounterField,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkResolveResponse,
  SavedObjectsCreateOptions,
  SavedObjectsFindResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsUpdateObjectsSpacesResponse,
  SavedObjectsUpdateObjectsSpacesOptions,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
  SavedObjectsRemoveReferencesToResponse,
  SavedObjectsCheckConflictsObject,
  SavedObjectsCheckConflictsResponse,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsFindOptionsReference,
  SavedObjectsFindResult,
  SavedObjectsRemoveReferencesToOptions,
  SavedObjectsDeleteOptions,
  SavedObjectsOpenPointInTimeResponse,
  SavedObjectsBulkUpdateObject,
  SavedObjectsClosePointInTimeResponse,
  ISavedObjectsPointInTimeFinder,
  SavedObjectsCreatePointInTimeFinderDependencies,
  SavedObjectsPitParams,
  SavedObjectsResolveOptions,
  SavedObjectsResolveResponse,
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsUpdateObjectsSpacesResponseObject,
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectReferenceWithContext,
  SavedObjectsUpdateOptions,
  SavedObjectsOpenPointInTimeOptions,
  SavedObjectsClosePointInTimeOptions,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsFindOptions,
  SavedObjectsGetOptions,
  SavedObjectsPointInTimeFinderClient,
  SavedObjectsBulkDeleteObject,
  SavedObjectsBulkDeleteOptions,
  SavedObjectsBulkDeleteStatus,
  SavedObjectsBulkDeleteResponse,
} from './src/apis';

export type {
  SavedObject,
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectAttributeSingle,
  SavedObjectReference,
} from '@kbn/core-saved-objects-common/src/server_types';
