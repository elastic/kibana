/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject } from '@kbn/core-saved-objects-common';
import type {
  SavedObjectsBaseOptions,
  SavedObjectsFindOptions,
  SavedObjectsClosePointInTimeOptions,
  SavedObjectsOpenPointInTimeOptions,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateObjectsSpacesOptions,
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsUpdateObjectsSpacesResponse,
  SavedObjectsResolveResponse,
  ISavedObjectsPointInTimeFinder,
  SavedObjectsRemoveReferencesToOptions,
  SavedObjectsClosePointInTimeResponse,
  SavedObjectsDeleteOptions,
  SavedObjectsCreatePointInTimeFinderDependencies,
  SavedObjectsCheckConflictsResponse,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsFindResponse,
  SavedObjectsCreateOptions,
  SavedObjectsCheckConflictsObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkResolveResponse,
  SavedObjectsBulkResolveObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkCreateObject,
  SavedObjectsOpenPointInTimeResponse,
  SavedObjectsRemoveReferencesToResponse,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
  SavedObjectsBulkResponse,
  SavedObjectsBulkDeleteObject,
  SavedObjectsBulkDeleteOptions,
  SavedObjectsBulkDeleteResponse,
} from './apis';

/**
 * Saved Objects is Kibana's data persisentence mechanism allowing plugins to
 * use Elasticsearch for storing plugin state.
 *
 * ## SavedObjectsClient errors
 *
 * Since the SavedObjectsClient has its hands in everything we
 * are a little paranoid about the way we present errors back to
 * to application code. Ideally, all errors will be either:
 *
 *   1. Caused by bad implementation (ie. undefined is not a function) and
 *      as such unpredictable
 *   2. An error that has been classified and decorated appropriately
 *      by the decorators in {@link SavedObjectsErrorHelpers}
 *
 * Type 1 errors are inevitable, but since all expected/handle-able errors
 * should be Type 2 the `isXYZError()` helpers exposed at
 * `SavedObjectsErrorHelpers` should be used to understand and manage error
 * responses from the `SavedObjectsClient`.
 *
 * Type 2 errors are decorated versions of the source error, so if
 * the elasticsearch client threw an error it will be decorated based
 * on its type. That means that rather than looking for `error.body.error.type` or
 * doing substring checks on `error.body.error.reason`, just use the helpers to
 * understand the meaning of the error:
 *
 *   ```js
 *   if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
 *      // handle 404
 *   }
 *
 *   if (SavedObjectsErrorHelpers.isNotAuthorizedError(error)) {
 *      // 401 handling should be automatic, but in case you wanted to know
 *   }
 *
 *   // always rethrow the error unless you handle it
 *   throw error;
 *   ```
 *
 * ### 404s from missing index
 *
 * From the perspective of application code and APIs the SavedObjectsClient is
 * a black box that persists objects. One of the internal details that users have
 * no control over is that we use an elasticsearch index for persistence and that
 * index might be missing.
 *
 * At the time of writing we are in the process of transitioning away from the
 * operating assumption that the SavedObjects index is always available. Part of
 * this transition is handling errors resulting from an index missing. These used
 * to trigger a 500 error in most cases, and in others cause 404s with different
 * error messages.
 *
 * From my (Spencer) perspective, a 404 from the SavedObjectsApi is a 404; The
 * object the request/call was targeting could not be found. This is why #14141
 * takes special care to ensure that 404 errors are generic and don't distinguish
 * between index missing or document missing.
 *
 * See {@link SavedObjectsClient}
 * See {@link SavedObjectsErrorHelpers}
 *
 * @public
 */
export interface SavedObjectsClientContract {
  /**
   * Persists a SavedObject
   *
   * @param type
   * @param attributes
   * @param options
   */
  create<T = unknown>(
    type: string,
    attributes: T,
    options?: SavedObjectsCreateOptions
  ): Promise<SavedObject<T>>;

  /**
   * Persists multiple documents batched together as a single request
   *
   * @param objects
   * @param options
   */
  bulkCreate<T = unknown>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options?: SavedObjectsCreateOptions
  ): Promise<SavedObjectsBulkResponse<T>>;

  /**
   * Check what conflicts will result when creating a given array of saved objects. This includes "unresolvable conflicts", which are
   * multi-namespace objects that exist in a different namespace; such conflicts cannot be resolved/overwritten.
   *
   * @param objects
   * @param options
   */
  checkConflicts(
    objects: SavedObjectsCheckConflictsObject[],
    options?: SavedObjectsBaseOptions
  ): Promise<SavedObjectsCheckConflictsResponse>;

  /**
   * Deletes a SavedObject
   *
   * @param type
   * @param id
   * @param options
   */
  delete(type: string, id: string, options?: SavedObjectsDeleteOptions): Promise<{}>;

  /**
   * Deletes multiple SavedObjects batched together as a single request
   *
   * @param objects
   * @param options
   */
  bulkDelete(
    objects: SavedObjectsBulkDeleteObject[],
    options?: SavedObjectsBulkDeleteOptions
  ): Promise<SavedObjectsBulkDeleteResponse>;
  /**
   * Find all SavedObjects matching the search query
   *
   * @param options
   */
  find<T = unknown, A = unknown>(
    options: SavedObjectsFindOptions
  ): Promise<SavedObjectsFindResponse<T, A>>;

  /**
   * Returns an array of objects by id
   *
   * @param objects - an array of ids, or an array of objects containing id, type and optionally fields
   * @example
   *
   * bulkGet([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   */
  bulkGet<T = unknown>(
    objects: SavedObjectsBulkGetObject[],
    options?: SavedObjectsBaseOptions
  ): Promise<SavedObjectsBulkResponse<T>>;

  /**
   * Retrieves a single object
   *
   * @param type - The type of SavedObject to retrieve
   * @param id - The ID of the SavedObject to retrieve
   * @param options
   */
  get<T = unknown>(
    type: string,
    id: string,
    options?: SavedObjectsBaseOptions
  ): Promise<SavedObject<T>>;

  /**
   * Resolves an array of objects by id, using any legacy URL aliases if they exist
   *
   * @param objects - an array of objects containing id, type
   * @example
   *
   * bulkResolve([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   *
   * @note Saved objects that Kibana fails to find are replaced with an error object and an "exactMatch" outcome. The rationale behind the
   * outcome is that "exactMatch" is the default outcome, and the outcome only changes if an alias is found. This behavior is unique to
   * `bulkResolve`; the regular `resolve` API will throw an error instead.
   */
  bulkResolve<T = unknown>(
    objects: SavedObjectsBulkResolveObject[],
    options?: SavedObjectsBaseOptions
  ): Promise<SavedObjectsBulkResolveResponse<T>>;

  /**
   * Resolves a single object, using any legacy URL alias if it exists
   *
   * @param type - The type of SavedObject to retrieve
   * @param id - The ID of the SavedObject to retrieve
   * @param options
   */
  resolve<T = unknown>(
    type: string,
    id: string,
    options?: SavedObjectsBaseOptions
  ): Promise<SavedObjectsResolveResponse<T>>;

  /**
   * Updates an SavedObject
   *
   * @param type
   * @param id
   * @param options
   */
  update<T = unknown>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options?: SavedObjectsUpdateOptions<T>
  ): Promise<SavedObjectsUpdateResponse<T>>;

  /**
   * Bulk Updates multiple SavedObject at once
   *
   * @param objects
   */
  bulkUpdate<T = unknown>(
    objects: Array<SavedObjectsBulkUpdateObject<T>>,
    options?: SavedObjectsBulkUpdateOptions
  ): Promise<SavedObjectsBulkUpdateResponse<T>>;

  /**
   * Updates all objects containing a reference to the given {type, id} tuple to remove the said reference.
   */
  removeReferencesTo(
    type: string,
    id: string,
    options?: SavedObjectsRemoveReferencesToOptions
  ): Promise<SavedObjectsRemoveReferencesToResponse>;

  /**
   * Opens a Point In Time (PIT) against the indices for the specified Saved Object types.
   * The returned `id` can then be passed to {@link SavedObjectsClient.find} to search
   * against that PIT.
   *
   * Only use this API if you have an advanced use case that's not solved by the
   * {@link SavedObjectsClient.createPointInTimeFinder} method.
   */
  openPointInTimeForType(
    type: string | string[],
    options?: SavedObjectsOpenPointInTimeOptions
  ): Promise<SavedObjectsOpenPointInTimeResponse>;

  /**
   * Closes a Point In Time (PIT) by ID. This simply proxies the request to ES via the
   * Elasticsearch client, and is included in the Saved Objects Client as a convenience
   * for consumers who are using {@link SavedObjectsClient.openPointInTimeForType}.
   *
   * Only use this API if you have an advanced use case that's not solved by the
   * {@link SavedObjectsClient.createPointInTimeFinder} method.
   */
  closePointInTime(
    id: string,
    options?: SavedObjectsClosePointInTimeOptions
  ): Promise<SavedObjectsClosePointInTimeResponse>;

  /**
   * Returns a {@link ISavedObjectsPointInTimeFinder} to help page through
   * large sets of saved objects. We strongly recommend using this API for
   * any `find` queries that might return more than 1000 saved objects,
   * however this API is only intended for use in server-side "batch"
   * processing of objects where you are collecting all objects in memory
   * or streaming them back to the client.
   *
   * Do NOT use this API in a route handler to facilitate paging through
   * saved objects on the client-side unless you are streaming all of the
   * results back to the client at once. Because the returned generator is
   * stateful, you cannot rely on subsequent http requests retrieving new
   * pages from the same Kibana server in multi-instance deployments.
   *
   * The generator wraps calls to {@link SavedObjectsClient.find} and iterates
   * over multiple pages of results using `_pit` and `search_after`. This will
   * open a new Point-In-Time (PIT), and continue paging until a set of
   * results is received that's smaller than the designated `perPage`.
   *
   * Once you have retrieved all of the results you need, it is recommended
   * to call `close()` to clean up the PIT and prevent Elasticsearch from
   * consuming resources unnecessarily. This is only required if you are
   * done iterating and have not yet paged through all of the results: the
   * PIT will automatically be closed for you once you reach the last page
   * of results, or if the underlying call to `find` fails for any reason.
   *
   * @example
   * ```ts
   * const findOptions: SavedObjectsCreatePointInTimeFinderOptions = {
   *   type: 'visualization',
   *   search: 'foo*',
   *   perPage: 100,
   * };
   *
   * const finder = savedObjectsClient.createPointInTimeFinder(findOptions);
   *
   * const responses: SavedObjectFindResponse[] = [];
   * for await (const response of finder.find()) {
   *   responses.push(...response);
   *   if (doneSearching) {
   *     await finder.close();
   *   }
   * }
   * ```
   */
  createPointInTimeFinder<T = unknown, A = unknown>(
    findOptions: SavedObjectsCreatePointInTimeFinderOptions,
    dependencies?: SavedObjectsCreatePointInTimeFinderDependencies
  ): ISavedObjectsPointInTimeFinder<T, A>;

  /**
   * Gets all references and transitive references of the listed objects. Ignores any object that is not a multi-namespace type.
   *
   * @param objects
   * @param options
   */
  collectMultiNamespaceReferences(
    objects: SavedObjectsCollectMultiNamespaceReferencesObject[],
    options?: SavedObjectsCollectMultiNamespaceReferencesOptions
  ): Promise<SavedObjectsCollectMultiNamespaceReferencesResponse>;

  /**
   * Updates one or more objects to add and/or remove them from specified spaces.
   *
   * @param objects
   * @param spacesToAdd
   * @param spacesToRemove
   * @param options
   */
  updateObjectsSpaces(
    objects: SavedObjectsUpdateObjectsSpacesObject[],
    spacesToAdd: string[],
    spacesToRemove: string[],
    options?: SavedObjectsUpdateObjectsSpacesOptions
  ): Promise<SavedObjectsUpdateObjectsSpacesResponse>;
}
