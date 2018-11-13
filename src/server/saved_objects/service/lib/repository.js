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

import { omit } from 'lodash';
import { getRootType, getRootPropertiesObjects } from '../../../mappings';
import { getSearchDsl } from './search_dsl';
import { includedFields } from './included_fields';
import { decorateEsError } from './decorate_es_error';
import * as errors from './errors';

// BEWARE: The SavedObjectClient depends on the implementation details of the SavedObjectsRepository
// so any breaking changes to this repository are considered breaking changes to the SavedObjectsClient.

export class SavedObjectsRepository {
  constructor(options) {
    const {
      index,
      mappings,
      callCluster,
      schema,
      serializer,
      migrator,
      onBeforeWrite = () => { },
    } = options;

    // It's important that we migrate documents / mark them as up-to-date
    // prior to writing them to the index. Otherwise, we'll cause unecessary
    // index migrations to run at Kibana startup, and those will probably fail
    // due to invalidly versioned documents in the index.
    //
    // The migrator performs double-duty, and validates the documents prior
    // to returning them.
    this._migrator = migrator;
    this._index = index;
    this._mappings = mappings;
    this._schema = schema;
    this._type = getRootType(this._mappings);
    this._onBeforeWrite = onBeforeWrite;
    this._unwrappedCallCluster = async (...args) => {
      await migrator.awaitMigration();
      return callCluster(...args);
    };
    this._schema = schema;
    this._serializer = serializer;
  }

  /**
   * Persists an object
   *
   * @param {string} type
   * @param {object} attributes
   * @param {object} [options={}]
   * @property {string} [options.id] - force id on creation, not recommended
   * @property {boolean} [options.overwrite=false]
   * @property {object} [options.migrationVersion=undefined]
   * @property {string} [options.namespace]
   * @returns {promise} - { id, type, version, attributes }
  */
  async create(type, attributes = {}, options = {}) {
    const {
      id,
      migrationVersion,
      overwrite = false,
      namespace,
    } = options;

    const method = id && !overwrite ? 'create' : 'index';
    const time = this._getCurrentTime();

    try {
      const migrated = this._migrator.migrateDocument({
        id,
        type,
        namespace,
        attributes,
        migrationVersion,
        updated_at: time,
      });

      const raw = this._serializer.savedObjectToRaw(migrated);

      const response = await this._writeToCluster(method, {
        id: raw._id,
        type: this._type,
        index: this._index,
        refresh: 'wait_for',
        body: raw._source,
      });

      return this._rawToSavedObject({
        ...raw,
        ...response,
      });
    } catch (error) {
      if (errors.isNotFoundError(error)) {
        // See "503s from missing index" above
        throw errors.createEsAutoCreateIndexError();
      }

      throw error;
    }
  }

  /**
   * Creates multiple documents at once
   *
   * @param {array} objects - [{ type, id, attributes, migrationVersion }]
   * @param {object} [options={}]
   * @property {boolean} [options.overwrite=false] - overwrites existing documents
   * @property {string} [options.namespace]
   * @returns {promise} -  {saved_objects: [[{ id, type, version, attributes, error: { message } }]}
   */
  async bulkCreate(objects, options = {}) {
    const {
      namespace,
      overwrite = false,
    } = options;
    const time = this._getCurrentTime();
    const objectToBulkRequest = (object) => {
      const method = object.id && !overwrite ? 'create' : 'index';
      const migrated = this._migrator.migrateDocument({
        id: object.id,
        type: object.type,
        attributes: object.attributes,
        migrationVersion: object.migrationVersion,
        namespace,
        updated_at: time,
      });
      const raw = this._serializer.savedObjectToRaw(migrated);

      return [
        {
          [method]: {
            _id: raw._id,
            _type: this._type,
          }
        },
        raw._source,
      ];
    };

    const { items } = await this._writeToCluster('bulk', {
      index: this._index,
      refresh: 'wait_for',
      body: objects.reduce((acc, object) => ([
        ...acc,
        ...objectToBulkRequest(object)
      ]), []),
    });

    return {
      saved_objects: items.map((response, i) => {
        const {
          error,
          _id: responseId,
          _version: version,
        } = Object.values(response)[0];

        const {
          id = responseId,
          type,
          attributes,
        } = objects[i];

        if (error) {
          if (error.type === 'version_conflict_engine_exception') {
            return {
              id,
              type,
              error: { statusCode: 409, message: 'version conflict, document already exists' }
            };
          }
          return {
            id,
            type,
            error: {
              message: error.reason || JSON.stringify(error)
            }
          };
        }

        return {
          id,
          type,
          updated_at: time,
          version,
          attributes
        };
      })
    };
  }

  /**
   * Deletes an object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} [options={}]
   * @property {string} [options.namespace]
   * @returns {promise}
   */
  async delete(type, id, options = {}) {
    const {
      namespace
    } = options;

    const response = await this._writeToCluster('delete', {
      id: this._serializer.generateRawId(namespace, type, id),
      type: this._type,
      index: this._index,
      refresh: 'wait_for',
      ignore: [404],
    });

    const deleted = response.result === 'deleted';
    if (deleted) {
      return {};
    }

    const docNotFound = response.result === 'not_found';
    const indexNotFound = response.error && response.error.type === 'index_not_found_exception';
    if (docNotFound || indexNotFound) {
      // see "404s from missing index" above
      throw errors.createGenericNotFoundError(type, id);
    }

    throw new Error(
      `Unexpected Elasticsearch DELETE response: ${JSON.stringify({ type, id, response, })}`
    );
  }

  /**
   * Deletes all objects from the provided namespace.
   *
   * @param {string} namespace
   * @returns {promise} - { took, timed_out, total, deleted, batches, version_conflicts, noops, retries, failures }
   */
  async deleteByNamespace(namespace) {

    if (!namespace || typeof namespace !== 'string') {
      throw new TypeError(`namespace is required, and must be a string`);
    }

    const allTypes = Object.keys(getRootPropertiesObjects(this._mappings));

    const typesToDelete = allTypes.filter(type => !this._schema.isNamespaceAgnostic(type));

    const esOptions = {
      index: this._index,
      ignore: [404],
      refresh: 'wait_for',
      body: {
        conflicts: 'proceed',
        ...getSearchDsl(this._mappings, this._schema, {
          namespace,
          type: typesToDelete,
        })
      }
    };

    return await this._writeToCluster('deleteByQuery', esOptions);
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
   * @property {string} [options.namespace]
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }], total, per_page, page }
   */
  async find(options = {}) {
    const {
      type,
      search,
      searchFields,
      page = 1,
      perPage = 20,
      sortField,
      sortOrder,
      fields,
      namespace,
    } = options;

    if (!type) {
      throw new TypeError(`options.type must be a string or an array of strings`);
    }

    if (searchFields && !Array.isArray(searchFields)) {
      throw new TypeError('options.searchFields must be an array');
    }

    if (fields && !Array.isArray(fields)) {
      throw new TypeError('options.searchFields must be an array');
    }

    const esOptions = {
      index: this._index,
      size: perPage,
      from: perPage * (page - 1),
      _source: includedFields(type, fields),
      ignore: [404],
      body: {
        version: true,
        ...getSearchDsl(this._mappings, this._schema, {
          search,
          searchFields,
          type,
          sortField,
          sortOrder,
          namespace,
        })
      }
    };

    const response = await this._callCluster('search', esOptions);

    if (response.status === 404) {
      // 404 is only possible here if the index is missing, which
      // we don't want to leak, see "404s from missing index" above
      return {
        page,
        per_page: perPage,
        total: 0,
        saved_objects: []
      };
    }

    return {
      page,
      per_page: perPage,
      total: response.hits.total,
      saved_objects: response.hits.hits.map(hit => this._rawToSavedObject(hit)),
    };
  }

  /**
   * Returns an array of objects by id
   *
   * @param {array} objects - an array ids, or an array of objects containing id and optionally type
   * @param {object} [options={}]
   * @property {string} [options.namespace]
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }] }
   * @example
   *
   * bulkGet([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   */
  async bulkGet(objects = [], options = {}) {
    const {
      namespace
    } = options;

    if (objects.length === 0) {
      return { saved_objects: [] };
    }

    const response = await this._callCluster('mget', {
      index: this._index,
      body: {
        docs: objects.map(object => ({
          _id: this._serializer.generateRawId(namespace, object.type, object.id),
          _type: this._type,
        }))
      }
    });

    return {
      saved_objects: response.docs.map((doc, i) => {
        const { id, type } = objects[i];

        if (!doc.found) {
          return {
            id,
            type,
            error: { statusCode: 404, message: 'Not found' }
          };
        }

        const time = doc._source.updated_at;
        return {
          id,
          type,
          ...time && { updated_at: time },
          version: doc._version,
          attributes: doc._source[type],
          migrationVersion: doc._source.migrationVersion,
        };
      })
    };
  }

  /**
   * Gets a single object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} [options={}]
   * @property {string} [options.namespace]
   * @returns {promise} - { id, type, version, attributes }
   */
  async get(type, id, options = {}) {
    const {
      namespace
    } = options;

    const response = await this._callCluster('get', {
      id: this._serializer.generateRawId(namespace, type, id),
      type: this._type,
      index: this._index,
      ignore: [404]
    });

    const docNotFound = response.found === false;
    const indexNotFound = response.status === 404;
    if (docNotFound || indexNotFound) {
      // see "404s from missing index" above
      throw errors.createGenericNotFoundError(type, id);
    }

    const { updated_at: updatedAt } = response._source;

    return {
      id,
      type,
      ...updatedAt && { updated_at: updatedAt },
      version: response._version,
      attributes: response._source[type],
      migrationVersion: response._source.migrationVersion,
    };
  }

  /**
   * Updates an object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} [options={}]
   * @property {integer} options.version - ensures version matches that of persisted object
   * @property {string} [options.namespace]
   * @returns {promise}
   */
  async update(type, id, attributes, options = {}) {
    const {
      version,
      namespace
    } = options;

    const time = this._getCurrentTime();
    const response = await this._writeToCluster('update', {
      id: this._serializer.generateRawId(namespace, type, id),
      type: this._type,
      index: this._index,
      version,
      refresh: 'wait_for',
      ignore: [404],
      body: {
        doc: {
          [type]: attributes,
          updated_at: time,
        }
      },
    });

    if (response.status === 404) {
      // see "404s from missing index" above
      throw errors.createGenericNotFoundError(type, id);
    }

    return {
      id,
      type,
      updated_at: time,
      version: response._version,
      attributes
    };
  }

  /**
   * Increases a counter field by one. Creates the document if one doesn't exist for the given id.
   *
   * @param {string} type
   * @param {string} id
   * @param {string} counterFieldName
   * @param {object} [options={}]
   * @property {object} [options.migrationVersion=undefined]
   * @returns {promise}
   */
  async incrementCounter(type, id, counterFieldName, options = {}) {
    if (typeof type !== 'string') {
      throw new Error('"type" argument must be a string');
    }
    if (typeof counterFieldName !== 'string') {
      throw new Error('"counterFieldName" argument must be a string');
    }

    const {
      migrationVersion,
      namespace,
    } = options;

    const time = this._getCurrentTime();


    const migrated = this._migrator.migrateDocument({
      id,
      type,
      attributes: { [counterFieldName]: 1 },
      migrationVersion,
      updated_at: time,
    });

    const raw = this._serializer.savedObjectToRaw(migrated);

    const response = await this._writeToCluster('update', {
      id: this._serializer.generateRawId(namespace, type, id),
      type: this._type,
      index: this._index,
      refresh: 'wait_for',
      _source: true,
      body: {
        script: {
          source: `
              if (ctx._source[params.type][params.counterFieldName] == null) {
                ctx._source[params.type][params.counterFieldName] = params.count;
              }
              else {
                ctx._source[params.type][params.counterFieldName] += params.count;
              }
              ctx._source.updated_at = params.time;
            `,
          lang: 'painless',
          params: {
            count: 1,
            time,
            type,
            counterFieldName,
          },
        },
        upsert: raw._source,
      },
    });

    return {
      id,
      type,
      updated_at: time,
      version: response._version,
      attributes: response.get._source[type],
    };


  }

  async _writeToCluster(method, params) {
    try {
      await this._onBeforeWrite();
      return await this._callCluster(method, params);
    } catch (err) {
      throw decorateEsError(err);
    }
  }

  async _callCluster(method, params) {
    try {
      return await this._unwrappedCallCluster(method, params);
    } catch (err) {
      throw decorateEsError(err);
    }
  }

  _getCurrentTime() {
    return new Date().toISOString();
  }

  // The internal representation of the saved object that the serializer returns
  // includes the namespace, and we use this for migrating documents. However, we don't
  // want the namespcae to be returned from the repository, as the repository scopes each
  // method transparently to the specified namespace.
  _rawToSavedObject(raw) {
    const savedObject = this._serializer.rawToSavedObject(raw);
    return omit(savedObject, 'namespace');
  }
}
