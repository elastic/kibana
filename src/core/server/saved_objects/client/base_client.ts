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

import { errors } from '../lib';
import { AccessFacade } from '../data';

//TODO: prevent this class from being used without context

export class BaseClient {
  constructor(private readonly accessFacade: AccessFacade) {}

  /**
   * ## Errors
   *
   * Errors are either:
   *
   *   1. Unknown, caused by bad implementation (i.e., undefined is not a function)
   *   2. Known, classified and decorated appropriately by `./lib/errors`
   *
   * Known errors are decorated versions of the source error. When the
   * Elasticsearch client throws an error, we decorate it based on its type.
   * Rather than checking `error.body.error.type` or `error.body.error.reason`,
   * use the helpers:
   *
   *   ```js
   *   if (savedObjectsClient.errors.isNotFoundError(error)) {
   *     // handle 404
   *   }
   *
   *   if (savedObjectsClient.errors.isNotAuthorizedError(error)) {
   *     // 401 handling should be automatic, but in case you wanted to know
   *   }
   *
   *   // always rethrow the error unless you handle it
   *   throw error;
   *   ```
   *
   * ### 404s
   *
   * We throw a 404 error when a document cannot be found, including when the
   * Internal Elasticsearch storage is missing.
   *
   * ### 503s
   *
   * `create` requests create the internal Elasticsearch storage if needed,
   * unless `action.auto_create_index` is false. In this case, `create` throws 503.
   *
   * @type {ErrorHelpers} see ./lib/errors
   */
  static errors = errors;
  errors = errors;

  /**
   * Persist an object
   *
   * @param {string} type
   * @param {object} attributes
   * @param {object} [options={}]
   * @property {string} [options.id] - force id on creation, not recommended
   * @property {boolean} [options.overwrite=false]
   * @returns {promise} - { id, type, version, attributes }
   */
  async create(type = '', attributes = {}, options = {}) {
    return this.accessFacade.create(type, attributes, options);
  }

  /**
   * Creates multiple documents at once
   *
   * @param {array} objects - [{ type, id, attributes }]
   * @param {object} [options={}]
   * @property {boolean} [options.overwrite=false] - overwrites existing documents
   * @returns {promise} - [{ id, type, version, attributes, error: { message } }]
   */
  async bulkCreate(objects = [], options = {}) {
    return this.accessFacade.bulkCreate(objects, options);
  }

  /**
   * Deletes an object
   *
   * @param {string} type
   * @param {string} id
   * @returns {promise}
   */
  async delete(type = '', id = '') {
    return this.accessFacade.delete(type, id);
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
    return this.accessFacade.find(options);
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
    return this.accessFacade.bulkGet(objects);
  }

  /**
   * Gets a single object
   *
   * @param {string} type
   * @param {string} id
   * @returns {promise} - { id, type, version, attributes }
   */
  async get(type = '', id = '') {
    return this.accessFacade.get(type, id);
  }

  /**
   * Updates an object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} attributes
   * @param {object} [options={}]
   * @property {integer} options.version - ensures version matches that of persisted object
   * @returns {promise}
   */
  async update(type = '', id = '', attributes = {}, options = {}) {
    return this.accessFacade.update(type, id, attributes, options);
  }
}
