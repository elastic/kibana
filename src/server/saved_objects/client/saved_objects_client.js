import Boom from 'boom';
import uuid from 'uuid';
import Rx from 'rxjs/Rx';

import { getRootType } from '../../mappings';

import {
  getSearchDsl,
  trimIdPrefix,
  includedFields,
  decorateEsError,
  errors,
  createSearchResponse$
} from './lib';

export class SavedObjectsClient {
  constructor(kibanaIndex, mappings, callAdminCluster) {
    this._kibanaIndex = kibanaIndex;
    this._mappings = mappings;
    this._type = getRootType(this._mappings);
    this._callAdminCluster = callAdminCluster;
  }

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
    const {
      id,
      overwrite = false
    } = options;

    const method = id && !overwrite ? 'create' : 'index';
    const time = this._getCurrentTime();
    const response = await this._withKibanaIndex(method, {
      id: this._generateEsId(type, id),
      type: this._type,
      refresh: 'wait_for',
      body: {
        type,
        updated_at: time,
        [type]: attributes
      },
    });

    return {
      id: trimIdPrefix(response._id, type),
      type,
      updated_at: time,
      version: response._version,
      attributes
    };
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
    const {
      overwrite = false
    } = options;
    const time = this._getCurrentTime();
    const objectToBulkRequest = (object) => {
      const method = object.id && !overwrite ? 'create' : 'index';

      return [
        {
          [method]: {
            _id: this._generateEsId(object.type, object.id),
            _type: this._type,
          }
        },
        {
          type: object.type,
          updated_at: time,
          [object.type]: object.attributes
        }
      ];
    };

    const { items } = await this._withKibanaIndex('bulk', {
      refresh: 'wait_for',
      body: objects.reduce((acc, object) => ([
        ...acc,
        ...objectToBulkRequest(object)
      ]), []),
    });

    return items.map((response, i) => {
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
    });
  }

  /**
   * Deletes an object
   *
   * @param {string} type
   * @param {string} id
   * @returns {promise}
   */
  async delete(type, id) {
    const response = await this._withKibanaIndex('delete', {
      id: this._generateEsId(type, id),
      type: this._type,
      refresh: 'wait_for',
    });

    if (response.found === false) {
      throw errors.decorateNotFoundError(Boom.notFound());
    }
  }

  /**
   * @param {object} [options={}]
   * @property {string} [options.type]
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
    return await this
      .createFindPage$({
        ...options,
        scroll: null
      })
      .first()
      .toPromise();
  }

  /**
   * Just like find, except it returns an observable of "find pages" which
   * use scrolling to retrieve all saved_objects matching the query
   *
   * Supports the same options as `this.find()` and adds `scroll`:
   *
   * @param {Object} [options]
   * @property {string} [options.scroll=1m] amount of time (in es duration format) that es should
   *                                        keep the search context open. Use `null` to disable
   *                                        scrolling if you only plan to take a single page, to
   *                                        prevent an unnecessary `DELETE /_scroll` request.
   * @returns {Rx<{page,per_page,total,saved_objects:Array<{id,type,version,attributes}>}>}
   */
  createFindPage$(options = {}) {
    const {
      type,
      search,
      searchFields,
      page: initialPage = 1,
      perPage = 20,
      sortField,
      sortOrder,
      fields,
      scroll = '1m',
    } = options;

    // we use defer so that thrown errors are emitted on the observable
    return Rx.Observable.defer(() => {
      if (searchFields && !Array.isArray(searchFields)) {
        throw new TypeError('options.searchFields must be an array');
      }

      if (fields && !Array.isArray(fields)) {
        throw new TypeError('options.searchFields must be an array');
      }

      const esOptions = {
        index: this._kibanaIndex,
        size: perPage,
        from: perPage * (initialPage - 1),
        _source: includedFields(type, fields),
        scroll,
        body: {
          version: true,
          ...getSearchDsl(this._mappings, {
            search,
            searchFields,
            type,
            sortField,
            sortOrder
          })
        }
      };

      let currentPage = initialPage;
      return createSearchResponse$(esOptions, this._callAdminCluster)
        .map(({ hits }) => ({
          page: currentPage++,
          per_page: perPage,
          total: hits.total,
          saved_objects: hits.hits.map(hit => {
            const { type, updated_at: updatedAt } = hit._source;
            return {
              id: trimIdPrefix(hit._id, type),
              type,
              ...updatedAt && { updated_at: updatedAt },
              version: hit._version,
              attributes: hit._source[type],
            };
          })
        }))
        .catch(error => {
          throw decorateEsError(error);
        });
    });
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
    if (objects.length === 0) {
      return { saved_objects: [] };
    }

    const response = await this._withKibanaIndex('mget', {
      body: {
        docs: objects.map(object => ({
          _id: this._generateEsId(object.type, object.id),
          _type: this._type,
        }))
      }
    });

    return {
      saved_objects: response.docs.map((doc, i) => {
        const { id, type } = objects[i];

        if (doc.found === false) {
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
          attributes: doc._source[type]
        };
      })
    };
  }

  /**
   * Gets a single object
   *
   * @param {string} type
   * @param {string} id
   * @returns {promise} - { id, type, version, attributes }
   */
  async get(type, id) {
    const response = await this._withKibanaIndex('get', {
      id: this._generateEsId(type, id),
      type: this._type,
    });
    const { updated_at: updatedAt } = response._source;

    return {
      id,
      type,
      ...updatedAt && { updated_at: updatedAt },
      version: response._version,
      attributes: response._source[type]
    };
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
    const time = this._getCurrentTime();
    const response = await this._withKibanaIndex('update', {
      id: this._generateEsId(type, id),
      type: this._type,
      version: options.version,
      refresh: 'wait_for',
      body: {
        doc: {
          updated_at: time,
          [type]: attributes
        }
      },
    });

    return {
      id,
      type,
      updated_at: time,
      version: response._version,
      attributes
    };
  }

  async _withKibanaIndex(method, params) {
    try {
      return await this._callAdminCluster(method, {
        ...params,
        index: this._kibanaIndex,
      });
    } catch (err) {
      throw decorateEsError(err);
    }
  }

  _generateEsId(type, id) {
    return `${type}:${id || uuid.v1()}`;
  }

  _getCurrentTime() {
    return new Date().toISOString();
  }
}
