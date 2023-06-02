/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  SavedObjectsBaseOptions,
  MutatingOperationRefreshSetting,
  SavedObjectsBulkResponse,
} from './base';
export type { SavedObjectsBulkCreateObject } from './bulk_create';
export type { SavedObjectsBulkGetObject } from './bulk_get';
export type {
  SavedObjectsBulkResolveObject,
  SavedObjectsBulkResolveResponse,
} from './bulk_resolve';
export type {
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsBulkUpdateOptions,
} from './bulk_update';
export type {
  SavedObjectsCheckConflictsObject,
  SavedObjectsCheckConflictsResponse,
} from './check_conflicts';
export type {
  SavedObjectsClosePointInTimeOptions,
  SavedObjectsClosePointInTimeResponse,
} from './close_point_in_time';
export type {
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectReferenceWithContext,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
} from './collect_multinamespace_references';
export type { SavedObjectsCreateOptions } from './create';
export type {
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsCreatePointInTimeFinderDependencies,
  ISavedObjectsPointInTimeFinder,
  SavedObjectsPointInTimeFinderClient,
} from './create_point_in_time_finder';
export type { SavedObjectsDeleteOptions } from './delete';
export type { SavedObjectsDeleteByNamespaceOptions } from './delete_by_namespace';
export type {
  SavedObjectsFindOptions,
  SavedObjectsFindOptionsReference,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  SavedObjectsPitParams,
} from './find';
export type { SavedObjectsGetOptions } from './get';
export type {
  SavedObjectsIncrementCounterField,
  SavedObjectsIncrementCounterOptions,
} from './increment_counter';
export type {
  SavedObjectsOpenPointInTimeOptions,
  SavedObjectsOpenPointInTimeResponse,
} from './open_point_in_time_for_type';
export type {
  SavedObjectsRemoveReferencesToOptions,
  SavedObjectsRemoveReferencesToResponse,
} from './remove_references_to';
export type { SavedObjectsResolveOptions, SavedObjectsResolveResponse } from './resolve';
export type { SavedObjectsUpdateResponse, SavedObjectsUpdateOptions } from './update';
export type {
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateObjectsSpacesResponse,
  SavedObjectsUpdateObjectsSpacesOptions,
  SavedObjectsUpdateObjectsSpacesResponseObject,
} from './update_objects_spaces';
export type {
  SavedObjectsBulkDeleteObject,
  SavedObjectsBulkDeleteOptions,
  SavedObjectsBulkDeleteStatus,
  SavedObjectsBulkDeleteResponse,
} from './bulk_delete';
