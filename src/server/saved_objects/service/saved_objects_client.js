/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  errors,
} from './lib';

export class SavedObjectsClient {
  constructor(repository) {
    this._repository = repository;
  }

  /**
   * ## SavedObjectsClient errors
   *
   * Since the SavedObjectsClient has its hands in everything we
   * are a little paranoid about the way we present errors back to
   * to application code. Ideally, all errors will be either:
   *
   *   1. Caused by bad implementation (ie. undefined is not a function) and
   *      as such unpredictable
   *   2. An error that has been classified and decorated appropriately
   *      by the decorators in `./lib/errors`
   *
   * Type 1 errors are inevitable, but since all expected/handle-able errors
   * should be Type 2 the `isXYZError()` helpers exposed at
   * `savedObjectsClient.errors` should be used to understand and manage error
   * responses from the `SavedObjectsClient`.
   *
   * Type 2 errors are decorated versions of the source error, so if
   * the elasticsearch client threw an error it will be decorated based
   * on its type. That means that rather than looking for `error.body.error.type` or
   * doing substring checks on `error.body.error.reason`, just use the helpers to
   * understand the meaning of the error:
   *
   *   ```js
   *   if (savedObjectsClient.errors.isNotFoundError(error)) {
   *      // handle 404
   *   }
   *
   *   if (savedObjectsClient.errors.isNotAuthorizedError(error)) {
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
   * no control over is that we use an elasticsearch index for persistance and that
   * index might be missing.
   *
   * At the time of writing we are in the process of transitioning away from the
   * operating assumption that the SavedObjects index is always available. Part of
   * this transition is handling errors resulting from an index missing. These used
   * to trigger a 500 error in most cases, and in others cause 404s with different
   * error messages.
   *
   * From my (Spencer) perspective, a 404 from the SavedObjectsApi is a 404; The
   * object the request/call was targetting could not be found. This is why #14141
   * takes special care to ensure that 404 errors are generic and don't distinguish
   * between index missing or document missing.
   *
   * ### 503s from missing index
   *
   * Unlike all other methods, create requests are supposed to succeed even when
   * the Kibana index does not exist because it will be automatically created by
   * elasticsearch. When that is not the case it is because Elasticsearch's
   * `action.auto_create_index` setting prevents it from being created automatically
   * so we throw a special 503 with the intention of informing the user that their
   * Elasticsearch settings need to be updated.
   *
   * @type {ErrorHelpers} see ./lib/errors
   */
  static errors = errors
  errors = errors

  /**
   * Persists an object
   *
   * @param {string} type
   * @param {object} attributes
   * @param {object} [options={}]
   * @property {string} [options.id] - force id on creation, not recommended
   * @property {boolean} [options.overwrite=false]
   * @returns {promise} - { id, type, version, attributes }
  */
  async create(type, attributes = {}, options = {}) {
    return this._repository.create(type, attributes, options);
  }

  /**
   * Creates multiple documents at once
   *
   * @param {array} objects - [{ type, id, attributes }]
   * @param {object} [options={}]
   * @property {boolean} [options.overwrite=false] - overwrites existing documents
   * @returns {promise} - [{ id, type, version, attributes, error: { message } }]
   */
  async bulkCreate(objects, options = {}) {
    return this._repository.bulkCreate(objects, options);
  }

  /**
   * Deletes an object
   *
   * @param {string} type
   * @param {string} id
   * @returns {promise}
   */
  async delete(type, id) {
    return this._repository.delete(type, id);
  }

  /**
   * @param {object} [options={}]
   * @property {(string|Array<string>)} [options.type]
   * @property {string} [options.search]
   * @property {Array<string>} [options.searchFields] - see Elasticsearch Simple Query String
   *                                        Query field argument for more information
   * @property {integer} [options.page=1]
   * @property {integer} [options.perPage=20]
   * @property {string} [options.sortField]
   * @property {string} [options.sortOrder]
   * @property {Array<string>} [options.fields]
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }], total, per_page, page }
   */
  async find(options = {}) {
    return this._repository.find(options);
  }

  /**
   * Returns an array of objects by id
   *
   * @param {array} objects - an array ids, or an array of objects containing id and optionally type
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }] }
   * @example
   *
   * bulkGet([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   */
  async bulkGet(objects = []) {
    return this._repository.bulkGet(objects);
  }

  /**
   * Gets a single object
   *
   * @param {string} type
   * @param {string} id
   * @returns {promise} - { id, type, version, attributes }
   */
  async get(type, id) {
    return this._repository.get(type, id);
  }

  /**
   * Updates an object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} [options={}]
   * @property {integer} options.version - ensures version matches that of persisted object
   * @returns {promise}
   */
  async update(type, id, attributes, options = {}) {
    return this._repository.update(type, id, attributes, options);
  }
}
