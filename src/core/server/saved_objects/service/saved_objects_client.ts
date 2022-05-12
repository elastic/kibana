/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ISavedObjectsRepository,
  ISavedObjectsPointInTimeFinder,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsCreatePointInTimeFinderDependencies,
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateObjectsSpacesOptions,
} from './lib';
import {
  SavedObject,
  SavedObjectError,
  SavedObjectReference,
  SavedObjectsMigrationVersion,
  SavedObjectsBaseOptions,
  MutatingOperationRefreshSetting,
  SavedObjectsFindOptions,
} from '../types';
import { SavedObjectsErrorHelpers } from './lib/errors';

/**
 *
 * @public
 */
export interface SavedObjectsCreateOptions extends SavedObjectsBaseOptions {
  /** (not recommended) Specify an id for the document */
  id?: string;
  /** Overwrite existing documents (defaults to false) */
  overwrite?: boolean;
  /**
   * An opaque version number which changes on each successful write operation.
   * Can be used in conjunction with `overwrite` for implementing optimistic concurrency control.
   **/
  version?: string;
  /** {@inheritDoc SavedObjectsMigrationVersion} */
  migrationVersion?: SavedObjectsMigrationVersion;
  /**
   * A semver value that is used when upgrading objects between Kibana versions. If undefined, this will be automatically set to the current
   * Kibana version when the object is created. If this is set to a non-semver value, or it is set to a semver value greater than the
   * current Kibana version, it will result in an error.
   *
   * @remarks
   * Do not attempt to set this manually. It should only be used if you retrieved an existing object that had the `coreMigrationVersion`
   * field set and you want to create it again.
   */
  coreMigrationVersion?: string;
  references?: SavedObjectReference[];
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: MutatingOperationRefreshSetting;
  /** Optional ID of the original saved object, if this object's `id` was regenerated */
  originId?: string;
  /**
   * Optional initial namespaces for the object to be created in. If this is defined, it will supersede the namespace ID that is in
   * {@link SavedObjectsCreateOptions}.
   *
   * * For shareable object types (registered with `namespaceType: 'multiple'`): this option can be used to specify one or more spaces,
   *   including the "All spaces" identifier (`'*'`).
   * * For isolated object types (registered with `namespaceType: 'single'` or `namespaceType: 'multiple-isolated'`): this option can only
   *   be used to specify a single space, and the "All spaces" identifier (`'*'`) is not allowed.
   * * For global object types (registered with `namespaceType: 'agnostic'`): this option cannot be used.
   */
  initialNamespaces?: string[];
}

/**
 *
 * @public
 */
export interface SavedObjectsBulkCreateObject<T = unknown> {
  id?: string;
  type: string;
  attributes: T;
  version?: string;
  references?: SavedObjectReference[];
  /** {@inheritDoc SavedObjectsMigrationVersion} */
  migrationVersion?: SavedObjectsMigrationVersion;
  /**
   * A semver value that is used when upgrading objects between Kibana versions. If undefined, this will be automatically set to the current
   * Kibana version when the object is created. If this is set to a non-semver value, or it is set to a semver value greater than the
   * current Kibana version, it will result in an error.
   *
   * @remarks
   * Do not attempt to set this manually. It should only be used if you retrieved an existing object that had the `coreMigrationVersion`
   * field set and you want to create it again.
   */
  coreMigrationVersion?: string;
  /** Optional ID of the original saved object, if this object's `id` was regenerated */
  originId?: string;
  /**
   * Optional initial namespaces for the object to be created in. If this is defined, it will supersede the namespace ID that is in
   * {@link SavedObjectsCreateOptions}.
   *
   * * For shareable object types (registered with `namespaceType: 'multiple'`): this option can be used to specify one or more spaces,
   *   including the "All spaces" identifier (`'*'`).
   * * For isolated object types (registered with `namespaceType: 'single'` or `namespaceType: 'multiple-isolated'`): this option can only
   *   be used to specify a single space, and the "All spaces" identifier (`'*'`) is not allowed.
   * * For global object types (registered with `namespaceType: 'agnostic'`): this option cannot be used.
   */
  initialNamespaces?: string[];
}

/**
 *
 * @public
 */
export interface SavedObjectsBulkUpdateObject<T = unknown>
  extends Pick<SavedObjectsUpdateOptions<T>, 'version' | 'references'> {
  /** The ID of this Saved Object, guaranteed to be unique for all objects of the same `type` */
  id: string;
  /**  The type of this Saved Object. Each plugin can define it's own custom Saved Object types. */
  type: string;
  /** {@inheritdoc SavedObjectAttributes} */
  attributes: Partial<T>;
  /**
   * Optional namespace string to use when searching for this object. If this is defined, it will supersede the namespace ID that is in
   * {@link SavedObjectsBulkUpdateOptions}.
   *
   * Note: the default namespace's string representation is `'default'`, and its ID representation is `undefined`.
   **/
  namespace?: string;
}

/**
 *
 * @public
 */
export interface SavedObjectsBulkResponse<T = unknown> {
  saved_objects: Array<SavedObject<T>>;
}

/**
 *
 * @public
 */
export interface SavedObjectsFindResult<T = unknown> extends SavedObject<T> {
  /**
   * The Elasticsearch `_score` of this result.
   */
  score: number;
  /**
   * The Elasticsearch `sort` value of this result.
   *
   * @remarks
   * This can be passed directly to the `searchAfter` param in the {@link SavedObjectsFindOptions}
   * in order to page through large numbers of hits. It is recommended you use this alongside
   * a Point In Time (PIT) that was opened with {@link SavedObjectsClient.openPointInTimeForType}.
   *
   * @example
   * ```ts
   * const { id } = await savedObjectsClient.openPointInTimeForType('visualization');
   * const page1 = await savedObjectsClient.find({
   *   type: 'visualization',
   *   sortField: 'updated_at',
   *   sortOrder: 'asc',
   *   pit: { id },
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
   */
  sort?: string[];
}

/**
 * Return type of the Saved Objects `find()` method.
 *
 * *Note*: this type is different between the Public and Server Saved Objects
 * clients.
 *
 * @public
 */
export interface SavedObjectsFindResponse<T = unknown, A = unknown> {
  aggregations?: A;
  saved_objects: Array<SavedObjectsFindResult<T>>;
  total: number;
  per_page: number;
  page: number;
  pit_id?: string;
}

/**
 *
 * @public
 */
export interface SavedObjectsCheckConflictsObject {
  id: string;
  type: string;
}

/**
 *
 * @public
 */
export interface SavedObjectsCheckConflictsResponse {
  errors: Array<{
    id: string;
    type: string;
    error: SavedObjectError;
  }>;
}

/**
 *
 * @public
 */
export interface SavedObjectsUpdateOptions<Attributes = unknown> extends SavedObjectsBaseOptions {
  /** An opaque version number which changes on each successful write operation. Can be used for implementing optimistic concurrency control. */
  version?: string;
  /** {@inheritdoc SavedObjectReference} */
  references?: SavedObjectReference[];
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: MutatingOperationRefreshSetting;
  /** If specified, will be used to perform an upsert if the document doesn't exist */
  upsert?: Attributes;
}

/**
 *
 * @public
 */
export interface SavedObjectsRemoveReferencesToOptions extends SavedObjectsBaseOptions {
  /** The Elasticsearch Refresh setting for this operation. Defaults to `true` */
  refresh?: boolean;
}

/**
 *
 * @public
 */
export interface SavedObjectsRemoveReferencesToResponse extends SavedObjectsBaseOptions {
  /** The number of objects that have been updated by this operation */
  updated: number;
}

/**
 *
 * @public
 */
export interface SavedObjectsBulkUpdateOptions extends SavedObjectsBaseOptions {
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: MutatingOperationRefreshSetting;
}

/**
 *
 * @public
 */
export interface SavedObjectsDeleteOptions extends SavedObjectsBaseOptions {
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: MutatingOperationRefreshSetting;
  /** Force deletion of an object that exists in multiple namespaces */
  force?: boolean;
}

/**
 *
 * @public
 */
export interface SavedObjectsBulkGetObject {
  id: string;
  type: string;
  /** SavedObject fields to include in the response */
  fields?: string[];
  /**
   * Optional namespace(s) for the object to be retrieved in. If this is defined, it will supersede the namespace ID that is in the
   * top-level options.
   *
   * * For shareable object types (registered with `namespaceType: 'multiple'`): this option can be used to specify one or more spaces,
   *   including the "All spaces" identifier (`'*'`).
   * * For isolated object types (registered with `namespaceType: 'single'` or `namespaceType: 'multiple-isolated'`): this option can only
   *   be used to specify a single space, and the "All spaces" identifier (`'*'`) is not allowed.
   * * For global object types (registered with `namespaceType: 'agnostic'`): this option cannot be used.
   */
  namespaces?: string[];
}

/**
 *
 * @public
 */
export interface SavedObjectsBulkResponse<T = unknown> {
  saved_objects: Array<SavedObject<T>>;
}

/**
 *
 * @public
 */
export interface SavedObjectsBulkUpdateResponse<T = unknown> {
  saved_objects: Array<SavedObjectsUpdateResponse<T>>;
}

/**
 *
 * @public
 */
export interface SavedObjectsUpdateResponse<T = unknown>
  extends Omit<SavedObject<T>, 'attributes' | 'references'> {
  attributes: Partial<T>;
  references: SavedObjectReference[] | undefined;
}

/**
 *
 * @public
 */
export interface SavedObjectsBulkResolveObject {
  id: string;
  type: string;
}

/**
 *
 * @public
 */
export interface SavedObjectsBulkResolveResponse<T = unknown> {
  resolved_objects: Array<SavedObjectsResolveResponse<T>>;
}

/**
 *
 * @public
 */
export interface SavedObjectsResolveResponse<T = unknown> {
  /**
   * The saved object that was found.
   */
  saved_object: SavedObject<T>;
  /**
   * The outcome for a successful `resolve` call is one of the following values:
   *
   *  * `'exactMatch'` -- One document exactly matched the given ID.
   *  * `'aliasMatch'` -- One document with a legacy URL alias matched the given ID; in this case the `saved_object.id` field is different
   *    than the given ID.
   *  * `'conflict'` -- Two documents matched the given ID, one was an exact match and another with a legacy URL alias; in this case the
   *    `saved_object` object is the exact match, and the `saved_object.id` field is the same as the given ID.
   */
  outcome: 'exactMatch' | 'aliasMatch' | 'conflict';
  /**
   * The ID of the object that the legacy URL alias points to.
   *
   * **Note:** this field is *only* included when an alias was found (in other words, when the outcome is `'aliasMatch'` or `'conflict'`).
   */
  alias_target_id?: string;
  /**
   * The reason this alias was created.
   *
   * Currently this is used to determine whether or not a toast should be shown when a user is redirected from a legacy URL; if the alias
   * was created because of saved object conversion, then we will display a toast telling the user that the object has a new URL.
   *
   * **Note:** this field is *only* included when an alias was found (in other words, when the outcome is `'aliasMatch'` or `'conflict'`).
   */
  alias_purpose?: 'savedObjectConversion' | 'savedObjectImport';
}

/**
 * @public
 */
export interface SavedObjectsOpenPointInTimeOptions {
  /**
   * Optionally specify how long ES should keep the PIT alive until the next request. Defaults to `5m`.
   */
  keepAlive?: string;
  /**
   * An optional ES preference value to be used for the query.
   */
  preference?: string;
  /**
   * An optional list of namespaces to be used when opening the PIT.
   *
   * When the spaces plugin is enabled:
   *  - this will default to the user's current space (as determined by the URL)
   *  - if specified, the user's current space will be ignored
   *  - `['*']` will search across all available spaces
   */
  namespaces?: string[];
}

/**
 * @public
 */
export interface SavedObjectsOpenPointInTimeResponse {
  /**
   * PIT ID returned from ES.
   */
  id: string;
}

/**
 * @public
 */
export type SavedObjectsClosePointInTimeOptions = SavedObjectsBaseOptions;

/**
 * @public
 */
export interface SavedObjectsClosePointInTimeResponse {
  /**
   * If true, all search contexts associated with the PIT id are
   * successfully closed.
   */
  succeeded: boolean;
  /**
   * The number of search contexts that have been successfully closed.
   */
  num_freed: number;
}

/**
 *
 * @public
 */
export class SavedObjectsClient {
  public static errors = SavedObjectsErrorHelpers;
  public errors = SavedObjectsErrorHelpers;

  private _repository: ISavedObjectsRepository;

  /** @internal */
  constructor(repository: ISavedObjectsRepository) {
    this._repository = repository;
  }

  /**
   * Persists a SavedObject
   *
   * @param type
   * @param attributes
   * @param options
   */
  async create<T = unknown>(type: string, attributes: T, options?: SavedObjectsCreateOptions) {
    return await this._repository.create(type, attributes, options);
  }

  /**
   * Persists multiple documents batched together as a single request
   *
   * @param objects
   * @param options
   */
  async bulkCreate<T = unknown>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options?: SavedObjectsCreateOptions
  ) {
    return await this._repository.bulkCreate(objects, options);
  }

  /**
   * Check what conflicts will result when creating a given array of saved objects. This includes "unresolvable conflicts", which are
   * multi-namespace objects that exist in a different namespace; such conflicts cannot be resolved/overwritten.
   *
   * @param objects
   * @param options
   */
  async checkConflicts(
    objects: SavedObjectsCheckConflictsObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObjectsCheckConflictsResponse> {
    return await this._repository.checkConflicts(objects, options);
  }

  /**
   * Deletes a SavedObject
   *
   * @param type
   * @param id
   * @param options
   */
  async delete(type: string, id: string, options: SavedObjectsDeleteOptions = {}) {
    return await this._repository.delete(type, id, options);
  }

  /**
   * Find all SavedObjects matching the search query
   *
   * @param options
   */
  async find<T = unknown, A = unknown>(
    options: SavedObjectsFindOptions
  ): Promise<SavedObjectsFindResponse<T, A>> {
    return await this._repository.find(options);
  }

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
  async bulkGet<T = unknown>(
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObjectsBulkResponse<T>> {
    return await this._repository.bulkGet(objects, options);
  }

  /**
   * Retrieves a single object
   *
   * @param type - The type of SavedObject to retrieve
   * @param id - The ID of the SavedObject to retrieve
   * @param options
   */
  async get<T = unknown>(
    type: string,
    id: string,
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObject<T>> {
    return await this._repository.get(type, id, options);
  }

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
  async bulkResolve<T = unknown>(
    objects: SavedObjectsBulkResolveObject[],
    options?: SavedObjectsBaseOptions
  ): Promise<SavedObjectsBulkResolveResponse<T>> {
    return await this._repository.bulkResolve(objects, options);
  }

  /**
   * Resolves a single object, using any legacy URL alias if it exists
   *
   * @param type - The type of SavedObject to retrieve
   * @param id - The ID of the SavedObject to retrieve
   * @param options
   */
  async resolve<T = unknown>(
    type: string,
    id: string,
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObjectsResolveResponse<T>> {
    return await this._repository.resolve(type, id, options);
  }

  /**
   * Updates an SavedObject
   *
   * @param type
   * @param id
   * @param options
   */
  async update<T = unknown>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: SavedObjectsUpdateOptions<T> = {}
  ): Promise<SavedObjectsUpdateResponse<T>> {
    return await this._repository.update(type, id, attributes, options);
  }

  /**
   * Bulk Updates multiple SavedObject at once
   *
   * @param objects
   */
  async bulkUpdate<T = unknown>(
    objects: Array<SavedObjectsBulkUpdateObject<T>>,
    options?: SavedObjectsBulkUpdateOptions
  ): Promise<SavedObjectsBulkUpdateResponse<T>> {
    return await this._repository.bulkUpdate(objects, options);
  }

  /**
   * Updates all objects containing a reference to the given {type, id} tuple to remove the said reference.
   */
  async removeReferencesTo(
    type: string,
    id: string,
    options?: SavedObjectsRemoveReferencesToOptions
  ) {
    return await this._repository.removeReferencesTo(type, id, options);
  }

  /**
   * Opens a Point In Time (PIT) against the indices for the specified Saved Object types.
   * The returned `id` can then be passed to {@link SavedObjectsClient.find} to search
   * against that PIT.
   *
   * Only use this API if you have an advanced use case that's not solved by the
   * {@link SavedObjectsClient.createPointInTimeFinder} method.
   */
  async openPointInTimeForType(
    type: string | string[],
    options: SavedObjectsOpenPointInTimeOptions = {}
  ) {
    return await this._repository.openPointInTimeForType(type, options);
  }

  /**
   * Closes a Point In Time (PIT) by ID. This simply proxies the request to ES via the
   * Elasticsearch client, and is included in the Saved Objects Client as a convenience
   * for consumers who are using {@link SavedObjectsClient.openPointInTimeForType}.
   *
   * Only use this API if you have an advanced use case that's not solved by the
   * {@link SavedObjectsClient.createPointInTimeFinder} method.
   */
  async closePointInTime(id: string, options?: SavedObjectsClosePointInTimeOptions) {
    return await this._repository.closePointInTime(id, options);
  }

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
  ): ISavedObjectsPointInTimeFinder<T, A> {
    return this._repository.createPointInTimeFinder(findOptions, {
      client: this,
      // Include dependencies last so that SO client wrappers have their settings applied.
      ...dependencies,
    });
  }

  /**
   * Gets all references and transitive references of the listed objects. Ignores any object that is not a multi-namespace type.
   *
   * @param objects
   * @param options
   */
  async collectMultiNamespaceReferences(
    objects: SavedObjectsCollectMultiNamespaceReferencesObject[],
    options?: SavedObjectsCollectMultiNamespaceReferencesOptions
  ): Promise<SavedObjectsCollectMultiNamespaceReferencesResponse> {
    return await this._repository.collectMultiNamespaceReferences(objects, options);
  }

  /**
   * Updates one or more objects to add and/or remove them from specified spaces.
   *
   * @param objects
   * @param spacesToAdd
   * @param spacesToRemove
   * @param options
   */
  async updateObjectsSpaces(
    objects: SavedObjectsUpdateObjectsSpacesObject[],
    spacesToAdd: string[],
    spacesToRemove: string[],
    options?: SavedObjectsUpdateObjectsSpacesOptions
  ) {
    return await this._repository.updateObjectsSpaces(
      objects,
      spacesToAdd,
      spacesToRemove,
      options
    );
  }
}
