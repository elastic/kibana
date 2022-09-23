/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectTypeIdTuple } from '@kbn/core-saved-objects-common';
import type {
  ResolvedSimpleSavedObject,
  SavedObjectsBatchResponse,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkCreateOptions,
  SavedObjectsBulkResolveResponse,
  SavedObjectsBulkUpdateObject,
  SavedObjectsCreateOptions,
  SavedObjectsFindResponse,
  SavedObjectsFindOptions,
  SavedObjectsUpdateOptions,
  SavedObjectsDeleteOptions,
  SavedObjectsBulkDeleteResponse,
  SavedObjectsBulkDeleteOptions,
} from './apis';

import type { SimpleSavedObject } from './simple_saved_object';

/**
 * The client-side SavedObjectsClient is a thin convenience library around the SavedObjects
 * HTTP API for interacting with Saved Objects.
 *
 * @public
 */
export interface SavedObjectsClientContract {
  /**
   * Persists an object
   */
  create<T = unknown>(
    type: string,
    attributes: T,
    options?: SavedObjectsCreateOptions
  ): Promise<SimpleSavedObject<T>>;

  /**
   * Creates multiple documents at once
   * @returns The result of the create operation containing created saved objects.
   */
  bulkCreate(
    objects: SavedObjectsBulkCreateObject[],
    options?: SavedObjectsBulkCreateOptions
  ): Promise<SavedObjectsBatchResponse<unknown>>;

  /**
   * Deletes an object
   */
  delete(type: string, id: string, options?: SavedObjectsDeleteOptions): Promise<{}>;

  /**
   * Deletes multiple documents at once
   * @param objects - an array of objects containing id, type
   * @param options - optional force argument to force deletion of objects in a namespace other than the scoped client
   * @returns The bulk delete result for the saved objects for the given types and ids.
   */
  bulkDelete(
    objects: SavedObjectTypeIdTuple[],
    options?: SavedObjectsBulkDeleteOptions
  ): Promise<SavedObjectsBulkDeleteResponse>;

  /**
   * Search for objects
   *
   * @param {object} [options={}]
   * @property {string} options.type
   * @property {string} options.search
   * @property {string} options.searchFields - see Elasticsearch Simple Query String
   *                                        Query field argument for more information
   * @property {integer} [options.page=1]
   * @property {integer} [options.perPage=20]
   * @property {array} options.fields
   * @property {object} [options.hasReference] - { type, id }
   * @returns A find result with objects matching the specified search.
   */
  find<T = unknown, A = unknown>(
    options: SavedObjectsFindOptions
  ): Promise<SavedObjectsFindResponse<T>>;

  /**
   * Fetches a single object
   *
   * @param {string} type
   * @param {string} id
   * @returns The saved object for the given type and id.
   */
  get<T = unknown>(type: string, id: string): Promise<SimpleSavedObject<T>>;

  /**
   * Returns an array of objects by id
   *
   * @param {array} objects - an array ids, or an array of objects containing id and optionally type
   * @returns The saved objects with the given type and ids requested
   * @example
   *
   * bulkGet([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   */
  bulkGet(objects: SavedObjectTypeIdTuple[]): Promise<SavedObjectsBatchResponse<unknown>>;

  /**
   * Resolves a single object
   *
   * @param {string} type
   * @param {string} id
   * @returns The resolve result for the saved object for the given type and id.
   *
   * @note Saved objects that Kibana fails to find are replaced with an error object and an "exactMatch" outcome. The rationale behind the
   * outcome is that "exactMatch" is the default outcome, and the outcome only changes if an alias is found. This behavior for the `resolve`
   * API is unique to the public client, which batches individual calls with `bulkResolve` under the hood. We don't throw an error in that
   * case for legacy compatibility reasons.
   */
  resolve<T = unknown>(type: string, id: string): Promise<ResolvedSimpleSavedObject<T>>;

  /**
   * Resolves an array of objects by id, using any legacy URL aliases if they exist
   *
   * @param objects - an array of objects containing id, type
   * @returns The bulk resolve result for the saved objects for the given types and ids.
   * @example
   *
   * bulkResolve([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   *
   * @note Saved objects that Kibana fails to find are replaced with an error object and an "exactMatch" outcome. The rationale behind the
   * outcome is that "exactMatch" is the default outcome, and the outcome only changes if an alias is found. The `resolve` method in the
   * public client uses `bulkResolve` under the hood, so it behaves the same way.
   */
  bulkResolve<T = unknown>(
    objects: SavedObjectTypeIdTuple[]
  ): Promise<SavedObjectsBulkResolveResponse<T>>;

  /**
   * Updates an object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} attributes
   * @param {object} options
   * @prop {integer} options.version - ensures version matches that of persisted object
   * @prop {object} options.migrationVersion - The optional migrationVersion of this document
   * @returns
   */
  update<T = unknown>(
    type: string,
    id: string,
    attributes: T,
    options?: SavedObjectsUpdateOptions
  ): Promise<SimpleSavedObject<T>>;

  /**
   * Update multiple documents at once
   *
   * @param {array} objects - [{ type, id, attributes, options: { version, references } }]
   * @returns The result of the update operation containing both failed and updated saved objects.
   */
  bulkUpdate<T = unknown>(
    objects: SavedObjectsBulkUpdateObject[]
  ): Promise<SavedObjectsBatchResponse<T>>;
}
