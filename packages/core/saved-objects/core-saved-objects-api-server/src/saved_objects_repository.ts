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
  SavedObjectsGetOptions,
  SavedObjectsClosePointInTimeOptions,
  SavedObjectsOpenPointInTimeOptions,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateObjectsSpacesOptions,
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsUpdateObjectsSpacesResponse,
  SavedObjectsResolveOptions,
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
  SavedObjectsDeleteByNamespaceOptions,
  SavedObjectsIncrementCounterField,
  SavedObjectsIncrementCounterOptions,
  SavedObjectsBulkDeleteOptions,
  SavedObjectsBulkDeleteObject,
  SavedObjectsBulkDeleteResponse,
} from './apis';

/**
 * @internal
 */
export interface SavedObjectsFindInternalOptions {
  /** This is used for calls internal to the SO domain that need to use a PIT finder but want to prevent extensions from functioning.
   * We use the SOR's PointInTimeFinder internally when searching for aliases and shared origins for saved objects, but we
   * need to disable the extensions for that to function correctly.
   * Before, when we had SOC wrappers, the SOR's PointInTimeFinder did not have any of the wrapper functionality applied.
   * This disableExtensions internal option preserves that behavior.
   */
  disableExtensions?: boolean;
}

/**
 * The savedObjects repository contract.
 *
 * @public
 */
export interface ISavedObjectsRepository {
  /**
   * Persists an object
   *
   * @param {string} type - the type of object to create
   * @param {object} attributes - the attributes for the object to be created
   * @param {object} [options={}] {@link SavedObjectsCreateOptions} - options for the create operation
   * @property {string} [options.id] - force id on creation, not recommended
   * @property {boolean} [options.overwrite=false]
   * @property {string} [options.namespace]
   * @property {array} [options.references=[]] - [{ name, type, id }]
   * @property {string} [options.migrationVersionCompatibility]
   * @returns {promise} the created saved object { id, type, version, attributes }
   */
  create<T = unknown>(
    type: string,
    attributes: T,
    options?: SavedObjectsCreateOptions
  ): Promise<SavedObject<T>>;

  /**
   * Creates multiple documents at once
   *
   * @param {array} objects - array of objects to create [{ type, attributes, ... }]
   * @param {object} [options={}] {@link SavedObjectsCreateOptions} - options for the bulk create operation
   * @property {boolean} [options.overwrite=false] - overwrites existing documents
   * @property {string} [options.namespace]
   * @property {string} [options.migrationVersionCompatibility]
   * @returns {promise} - {saved_objects: [[{ id, type, version, references, attributes, error: { message } }]}
   */
  bulkCreate<T = unknown>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options?: SavedObjectsCreateOptions
  ): Promise<SavedObjectsBulkResponse<T>>;

  /**
   * Check what conflicts will result when creating a given array of saved objects. This includes "unresolvable conflicts", which are
   * multi-namespace objects that exist in a different namespace; such conflicts cannot be resolved/overwritten.
   *
   * @param {array} objects - array of objects to check for conflicts [{ id, type }]
   * @param {object} options {@link SavedObjectsBaseOptions} - options for the check conflict operation
   * @returns {promise} -  {errors: [{ id, type, error: { message } }]}
   */
  checkConflicts(
    objects: SavedObjectsCheckConflictsObject[],
    options?: SavedObjectsBaseOptions
  ): Promise<SavedObjectsCheckConflictsResponse>;

  /**
   * Deletes an object
   *
   * @param {string} type - the type of the object to delete
   * @param {string} id - the id of the object to delete
   * @param {object} [options={}] {@link SavedObjectsDeleteOptions} - options for the delete operation
   * @property {string} [options.namespace]
   */
  delete(type: string, id: string, options?: SavedObjectsDeleteOptions): Promise<{}>;

  /**
   * Deletes multiple documents at once
   * @param {array} objects - an array of objects to delete (contains id and type)
   * @param {object} [options={}] {@link SavedObjectsBulkDeleteOptions} - options for the bulk delete operation
   * @returns {promise} - { statuses: [{ id, type, success, error: { message } }] }
   */
  bulkDelete(
    objects: SavedObjectsBulkDeleteObject[],
    options?: SavedObjectsBulkDeleteOptions
  ): Promise<SavedObjectsBulkDeleteResponse>;

  /**
   * Deletes all objects from the provided namespace.
   *
   * @param {string} namespace - the namespace in which to delete all objects
   * @param {object} options {@link SavedObjectsDeleteByNamespaceOptions} - options for the delete by namespace operation
   * @returns {promise} - { took, timed_out, total, deleted, batches, version_conflicts, noops, retries, failures }
   */
  deleteByNamespace(
    namespace: string,
    options?: SavedObjectsDeleteByNamespaceOptions
  ): Promise<any>;

  /**
   * Find saved objects by query
   *
   * @param {object} [options={}] {@link SavedObjectsFindOptions} - options for the find operation
   * @property {(string|Array<string>)} [options.type]
   * @property {string} [options.search]
   * @property {string} [options.defaultSearchOperator]
   * @property {Array<string>} [options.searchFields] - see Elasticsearch Simple Query String
   *                                        Query field argument for more information
   * @property {integer} [options.page=1]
   * @property {integer} [options.perPage=20]
   * @property {Array<unknown>} [options.searchAfter]
   * @property {string} [options.sortField]
   * @property {string} [options.sortOrder]
   * @property {Array<string>} [options.fields]
   * @property {string} [options.namespace]
   * @property {object} [options.hasReference] - { type, id }
   * @property {string} [options.pit]
   * @property {string} [options.preference]
   * @param {object} internalOptions {@link SavedObjectsFindInternalOptions} - internal-only options for the find operation
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }], total, per_page, page }
   */
  find<T = unknown, A = unknown>(
    options: SavedObjectsFindOptions,
    internalOptions?: SavedObjectsFindInternalOptions
  ): Promise<SavedObjectsFindResponse<T, A>>;

  /**
   * Returns an array of objects by id
   *
   * @param {array} objects - an array of objects containing id, type and optionally fields
   * @param {object} [options={}] {@link SavedObjectsGetOptions} - options for the bulk get operation
   * @property {string} [options.migrationVersionCompatibility]
   * @property {string} [options.namespace]
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }] }
   * @example
   *
   * bulkGet([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   */
  bulkGet<T = unknown>(
    objects: SavedObjectsBulkGetObject[],
    options?: SavedObjectsGetOptions
  ): Promise<SavedObjectsBulkResponse<T>>;

  /**
   * Resolves an array of objects by id, using any legacy URL aliases if they exist
   *
   * @param {array} objects - an array of objects containing id, type
   * @param {object} [options={}] {@link SavedObjectsResolveOptions} - options for the bulk resolve operation
   * @property {string} [options.migrationVersionCompatibility]
   * @property {string} [options.namespace]
   * @returns {promise} - { resolved_objects: [{ saved_object, outcome }] }
   * @example
   *
   * bulkResolve([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   */
  bulkResolve<T = unknown>(
    objects: SavedObjectsBulkResolveObject[],
    options?: SavedObjectsResolveOptions
  ): Promise<SavedObjectsBulkResolveResponse<T>>;

  /**
   * Gets a single object
   *
   * @param {string} type - the type of the object to get
   * @param {string} id - the ID of the object to get
   * @param {object} [options={}] {@link SavedObjectsGetOptions} - options for the get operation
   * @property {string} [options.migrationVersionCompatibility]
   * @property {string} [options.namespace]
   * @returns {promise} - { id, type, version, attributes }
   */
  get<T = unknown>(
    type: string,
    id: string,
    options?: SavedObjectsGetOptions
  ): Promise<SavedObject<T>>;

  /**
   * Resolves a single object, using any legacy URL alias if it exists
   *
   * @param {string} type - the type of the object to resolve
   * @param {string} id - the id of the object to resolve
   * @param {object} [options={}] {@link SavedObjectsResolveOptions} - options for the resolve operation
   * @property {string} [options.migrationVersionCompatibility]
   * @property {string} [options.namespace]
   * @returns {promise} - { saved_object, outcome }
   */
  resolve<T = unknown>(
    type: string,
    id: string,
    options?: SavedObjectsResolveOptions
  ): Promise<SavedObjectsResolveResponse<T>>;

  /**
   * Updates an object
   *
   * @param {string} type - the type of the object to update
   * @param {string} id - the ID of the object to update
   * @param {object} attributes - attributes to update
   * @param {object} [options={}] {@link SavedObjectsUpdateOptions} - options for the update operation
   * @property {string} options.version - ensures version matches that of persisted object
   * @property {string} [options.namespace]
   * @property {array} [options.references] - [{ name, type, id }]
   * @returns {promise} - updated saved object
   */
  update<T = unknown>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options?: SavedObjectsUpdateOptions<T>
  ): Promise<SavedObjectsUpdateResponse<T>>;

  /**
   * Gets all references and transitive references of the given objects. Ignores any object and/or reference that is not a multi-namespace
   * type.
   *
   * @param {array} objects - The objects to get the references for (contains type and ID)
   * @param {object} options {@link SavedObjectsCollectMultiNamespaceReferencesOptions} - the options for the operation
   * @returns {promise} - {@link SavedObjectsCollectMultiNamespaceReferencesResponse} { objects: [{ type, id, spaces, inboundReferences, ... }] }
   */
  collectMultiNamespaceReferences(
    objects: SavedObjectsCollectMultiNamespaceReferencesObject[],
    options?: SavedObjectsCollectMultiNamespaceReferencesOptions
  ): Promise<SavedObjectsCollectMultiNamespaceReferencesResponse>;

  /**
   * Updates one or more objects to add and/or remove them from specified spaces.
   *
   * @param {array} objects - array of objects to update (contains type, ID, and optional parameters)
   * @param {array} spacesToAdd - array of spaces in which the objects should be added
   * @param {array} spacesToRemove - array of spaces from which the objects should be removed
   * @param {object} options {@link SavedObjectsUpdateObjectsSpacesOptions} - options for the operation
   * @returns {promise} - { objects: [{ id, type, spaces, error: { message } }] }
   */
  updateObjectsSpaces(
    objects: SavedObjectsUpdateObjectsSpacesObject[],
    spacesToAdd: string[],
    spacesToRemove: string[],
    options?: SavedObjectsUpdateObjectsSpacesOptions
  ): Promise<SavedObjectsUpdateObjectsSpacesResponse>;

  /**
   * Updates multiple objects in bulk
   *
   * @param {array} objects - array of objects to update (contains type, id, attributes, options: { version, namespace } references)
   * @param {object} options {@link SavedObjectsBulkUpdateOptions} - options for the bulk update operation
   * @property {string} options.version - ensures version matches that of persisted object
   * @property {string} [options.namespace]
   * @returns {promise} -  {saved_objects: [[{ id, type, version, references, attributes, error: { message } }]}
   */
  bulkUpdate<T = unknown>(
    objects: Array<SavedObjectsBulkUpdateObject<T>>,
    options?: SavedObjectsBulkUpdateOptions
  ): Promise<SavedObjectsBulkUpdateResponse<T>>;

  /**
   * Updates all objects containing a reference to the given {type, id} tuple to remove the said reference.
   *
   * @remarks
   * Will throw a conflict error if the `update_by_query` operation returns any failure. In that case some
   * references might have been removed, and some were not. It is the caller's responsibility to handle and fix
   * this situation if it was to happen.
   *
   * Intended use is to provide clean up of any references to an object which is being deleted (e.g. deleting
   * a tag). See discussion here: https://github.com/elastic/kibana/issues/135259#issuecomment-1482515139
   *
   * When security is enabled, authorization for this method is based only on authorization to delete the object
   * represented by the {type, id} tuple. Therefore it is recommended only to call this method for the intended
   * use case.
   *
   * @param {string} type - the type of the object to remove references to
   * @param {string} id - the ID of the object to remove references to
   * @param {object} options {@link SavedObjectsRemoveReferencesToOptions} - options for the remove references operation
   * @returns {promise} - { number - the number of objects that have been updated by this operation }
   */
  removeReferencesTo(
    type: string,
    id: string,
    options?: SavedObjectsRemoveReferencesToOptions
  ): Promise<SavedObjectsRemoveReferencesToResponse>;

  /**
   * Increments all the specified counter fields (by one by default). Creates the document
   * if one doesn't exist for the given id.
   *
   * @remarks
   * When supplying a field name like `stats.api.counter` the field name will
   * be used as-is to create a document like:
   *   `{attributes: {'stats.api.counter': 1}}`
   * It will not create a nested structure like:
   *   `{attributes: {stats: {api: {counter: 1}}}}`
   *
   * When using incrementCounter for collecting usage data, you need to ensure
   * that usage collection happens on a best-effort basis and doesn't
   * negatively affect your plugin or users. See https://github.com/elastic/kibana/blob/main/src/plugins/usage_collection/README.mdx#tracking-interactions-with-incrementcounter)
   *
   * @example
   * ```ts
   * const repository = coreStart.savedObjects.createInternalRepository();
   *
   * // Initialize all fields to 0
   * repository
   *   .incrementCounter('dashboard_counter_type', 'counter_id', [
   *     'stats.apiCalls',
   *     'stats.sampleDataInstalled',
   *   ], {initialize: true});
   *
   * // Increment the apiCalls field counter
   * repository
   *   .incrementCounter('dashboard_counter_type', 'counter_id', [
   *     'stats.apiCalls',
   *   ])
   *
   * // Increment the apiCalls field counter by 4
   * repository
   *   .incrementCounter('dashboard_counter_type', 'counter_id', [
   *     { fieldName: 'stats.apiCalls' incrementBy: 4 },
   *   ])
   *
   * // Initialize the document with arbitrary fields if not present
   * repository.incrementCounter<{ appId: string }>(
   *   'dashboard_counter_type',
   *   'counter_id',
   *   [ 'stats.apiCalls'],
   *   { upsertAttributes: { appId: 'myId' } }
   * )
   * ```
   *
   * @param {string} type - The type of saved object whose fields should be incremented
   * @param {string} id - The id of the document whose fields should be incremented
   * @param {array} counterFields - An array of field names to increment or an array of {@link SavedObjectsIncrementCounterField}
   * @param {object} options {@link SavedObjectsIncrementCounterOptions}
   * @returns {promise} - The saved object after the specified fields were incremented
   */
  incrementCounter<T = unknown>(
    type: string,
    id: string,
    counterFields: Array<string | SavedObjectsIncrementCounterField>,
    options?: SavedObjectsIncrementCounterOptions<T>
  ): Promise<SavedObject<T>>;

  /**
   * Opens a Point In Time (PIT) against the indices for the specified Saved Object types.
   * The returned `id` can then be passed to `SavedObjects.find` to search against that PIT.
   *
   * Only use this API if you have an advanced use case that's not solved by the
   * {@link SavedObjectsRepository.createPointInTimeFinder} method.
   *
   * @example
   * ```ts
   * const { id } = await savedObjectsClient.openPointInTimeForType(
   *   type: 'visualization',
   *   { keepAlive: '5m' },
   * );
   * const page1 = await savedObjectsClient.find({
   *   type: 'visualization',
   *   sortField: 'updated_at',
   *   sortOrder: 'asc',
   *   pit: { id, keepAlive: '2m' },
   * });
   * const lastHit = page1.saved_objects[page1.saved_objects.length - 1];
   * const page2 = await savedObjectsClient.find({
   *   type: 'visualization',
   *   sortField: 'updated_at',
   *   sortOrder: 'asc',
   *   pit: { id: page1.pit_id },
   *   searchAfter: lastHit.sort,
   * });
   * await savedObjectsClient.closePointInTime(page2.pit_id);
   * ```
   *
   * @param {string|Array<string>} type - the type or types for the PIT
   * @param {object} [options] {@link SavedObjectsOpenPointInTimeOptions} - options for the open PIT operation
   * @property {string} [options.keepAlive]
   * @property {string} [options.preference]
   * @param {object} internalOptions {@link SavedObjectsFindInternalOptions} - internal options for the open PIT operation
   * @returns {promise} - { id - the ID for the PIT }
   */
  openPointInTimeForType(
    type: string | string[],
    options?: SavedObjectsOpenPointInTimeOptions,
    internalOptions?: SavedObjectsFindInternalOptions
  ): Promise<SavedObjectsOpenPointInTimeResponse>;

  /**
   * Closes a Point In Time (PIT) by ID. This simply proxies the request to ES
   * via the Elasticsearch client, and is included in the Saved Objects Client
   * as a convenience for consumers who are using `openPointInTimeForType`.
   *
   * Only use this API if you have an advanced use case that's not solved by the
   * {@link SavedObjectsRepository.createPointInTimeFinder} method.
   *
   * @remarks
   * While the `keepAlive` that is provided will cause a PIT to automatically close,
   * it is highly recommended to explicitly close a PIT when you are done with it
   * in order to avoid consuming unneeded resources in Elasticsearch.
   *
   * @example
   * ```ts
   * const repository = coreStart.savedObjects.createInternalRepository();
   *
   * const { id } = await repository.openPointInTimeForType(
   *   type: 'index-pattern',
   *   { keepAlive: '2m' },
   * );
   *
   * const response = await repository.find({
   *   type: 'index-pattern',
   *   search: 'foo*',
   *   sortField: 'name',
   *   sortOrder: 'desc',
   *   pit: {
   *     id: 'abc123',
   *     keepAlive: '2m',
   *   },
   *   searchAfter: [1234, 'abcd'],
   * });
   *
   * await repository.closePointInTime(response.pit_id);
   * ```
   *
   * @param {string} id - ID of the saved object
   * @param {object} [options] {@link SavedObjectsClosePointInTimeOptions} - options for the close PIT operation
   * @param {object} internalOptions {@link SavedObjectsFindInternalOptions} - internal options for the close PIT operation
   * @returns {promise} - { succeeded, num_freed - number of contexts closed }
   */
  closePointInTime(
    id: string,
    options?: SavedObjectsClosePointInTimeOptions,
    internalOptions?: SavedObjectsFindInternalOptions
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
   * This generator wraps calls to {@link SavedObjectsRepository.find} and
   * iterates over multiple pages of results using `_pit` and `search_after`.
   * This will open a new Point-In-Time (PIT), and continue paging until a
   * set of results is received that's smaller than the designated `perPage`.
   *
   * Once you have retrieved all of the results you need, it is recommended
   * to call `close()` to clean up the PIT and prevent Elasticsearch from
   * consuming resources unnecessarily. This is only required if you are
   * done iterating and have not yet paged through all of the results: the
   * PIT will automatically be closed for you once you reach the last page
   * of results, or if the underlying call to `find` fails for any reason.
   *
   * @param {object} findOptions - {@link SavedObjectsCreatePointInTimeFinderOptions} - the options for creating the point-in-time finder
   * @param {object} dependencies - {@link SavedObjectsCreatePointInTimeFinderDependencies} - the dependencies for creating the point-in-time finder
   * @returns - the point-in-time finder {@link ISavedObjectsPointInTimeFinder}
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
   * If the spaces extension is enabled, it's used to get the current namespace (and optionally throws an error if a
   * consumer attempted to specify the namespace explicitly).
   *
   * If the spaces extension is *not* enabled, this function simply normalizes the specified namespace so that
   * `'default'` can be used interchangeably with `undefined` i.e. the method always returns `undefined` for the default
   * namespace.
   */
  getCurrentNamespace(namespace?: string): string | undefined;
}
