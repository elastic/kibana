/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { ISavedObjectsRepository, SavedObjectsRepository } from './repository';
export { SavedObjectsClientProvider } from './scoped_client_provider';

export type {
  ISavedObjectsPointInTimeFinder,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsCreatePointInTimeFinderDependencies,
} from './point_in_time_finder';

export type {
  SavedObjectsClientWrapperFactory,
  SavedObjectsClientWrapperOptions,
  ISavedObjectsClientProvider,
  SavedObjectsClientProviderOptions,
  SavedObjectsClientFactory,
  SavedObjectsClientFactoryProvider,
} from './scoped_client_provider';

export { SavedObjectsErrorHelpers } from './errors';

export { SavedObjectsUtils } from './utils';

export type {
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
  SavedObjectReferenceWithContext,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
} from './collect_multi_namespace_references';

export type {
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateObjectsSpacesOptions,
  SavedObjectsUpdateObjectsSpacesResponse,
  SavedObjectsUpdateObjectsSpacesResponseObject,
} from './update_objects_spaces';

export { getIndexForType } from './get_index_for_type';
