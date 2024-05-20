/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsFindOptions, SavedObjectsFindResponse } from './find';
import type { ISavedObjectsRepository } from '../saved_objects_repository';

/**
 * Options for the create point-in-time finder operation
 *
 * @public
 */
export type SavedObjectsCreatePointInTimeFinderOptions = Omit<
  SavedObjectsFindOptions,
  'page' | 'pit' | 'searchAfter'
>;

/**
 * Point-in-time finder client.
 * Partially implements {@link ISavedObjectsRepository}
 *
 * @public
 */
export type SavedObjectsPointInTimeFinderClient = Pick<
  ISavedObjectsRepository,
  'find' | 'openPointInTimeForType' | 'closePointInTime'
>;

/**
 * Dependencies for the create point-in-time finder operation
 *
 * @public
 */
export interface SavedObjectsCreatePointInTimeFinderDependencies {
  /** the point-in-time finder client */
  client: SavedObjectsPointInTimeFinderClient;
}

/**
 * Point-in-time finder
 *
 * @public
 */
export interface ISavedObjectsPointInTimeFinder<T, A> {
  /**
   * An async generator which wraps calls to `savedObjectsClient.find` and
   * iterates over multiple pages of results using `_pit` and `search_after`.
   * This will open a new Point-In-Time (PIT), and continue paging until a set
   * of results is received that's smaller than the designated `perPage` size.
   */
  find: () => AsyncGenerator<SavedObjectsFindResponse<T, A>>;
  /**
   * Closes the Point-In-Time associated with this finder instance.
   *
   * Once you have retrieved all of the results you need, it is recommended
   * to call `close()` to clean up the PIT and prevent Elasticsearch from
   * consuming resources unnecessarily. This is only required if you are
   * done iterating and have not yet paged through all of the results: the
   * PIT will automatically be closed for you once you reach the last page
   * of results, or if the underlying call to `find` fails for any reason.
   */
  close: () => Promise<void>;
}
