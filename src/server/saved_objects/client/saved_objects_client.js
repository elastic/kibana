import Boom from 'boom';
import { get } from 'lodash';

import {
  createFindQuery,
  handleEsError,
} from './lib';

export class SavedObjectsClient {
  constructor(kibanaIndex, callAdminCluster) {
    this._kibanaIndex = kibanaIndex;
    this._callAdminCluster = callAdminCluster;
  }

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
    const method = options.id && !options.overwrite ? 'create' : 'index';
    const response = await this._withKibanaIndex(method, {
      type,
      id: options.id,
      body: attributes,
      refresh: 'wait_for'
    });

    return {
      id: response._id,
      type: response._type,
      version: response._version,
      attributes
    };
  }

  /**
   * Creates multiple documents at once
   *
   * @param {array} objects - [{ type, id, attributes }]
   * @param {object} [options={}]
   * @property {boolean} [options.overwrite=false] - overrides existing documents
   * @returns {promise} - [{ id, type, version, attributes, error: { message } }]
   */
  async bulkCreate(objects, options = {}) {
    const body = objects.reduce((acc, object) => {
      const method = get(options, 'overwrite', false) === false && object.id ? 'create' : 'index';

      acc.push({ [method]: { _type: object.type, _id: object.id } });
      acc.push(object.attributes);

      return acc;
    }, []);

    return await this._withKibanaIndex('bulk', { body, refresh: 'wait_for' })
      .then(resp => get(resp, 'items', []).map((resp, i) => {
        const method = Object.keys(resp)[0];

        return {
          id: resp[method]._id,
          type: resp[method]._type,
          version: resp[method]._version,
          attributes: objects[i].attributes,
          error: resp[method].error ? { message: get(resp[method], 'error.reason') } : undefined
        };
      }));
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
      type,
      id,
      refresh: 'wait_for'
    });

    if (get(response, 'found') === false) {
      throw Boom.notFound();
    }
  }

  /**
   * @param {object} [options={}]
   * @property {string} options.type
   * @property {string} options.search
   * @property {string} options.searchFields - see Elasticsearch Simple Query String
   *                                        Query field argument for more information
   * @property {integer} [options.page=1]
   * @property {integer} [options.perPage=20]
   * @property {array} options.fields
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }], total, per_page, page }
   */
  async find(options = {}) {
    const {
      type,
      search,
      searchFields,
      page = 1,
      perPage = 20,
      fields
    } = options;

    const esOptions = {
      type,
      _source: fields,
      size: perPage,
      from: perPage * (page - 1),
      body: createFindQuery({ search, searchFields, type })
    };

    const response = await this._withKibanaIndex('search', esOptions);

    return {
      saved_objects: get(response, 'hits.hits', []).map(r => {
        return {
          id: r._id,
          type: r._type,
          version: r._version,
          attributes: r._source
        };
      }),
      total: get(response, 'hits.total', 0),
      per_page: perPage,
      page

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
      type,
      id,
    });

    return {
      id: response._id,
      type: response._type,
      version: response._version,
      attributes: response._source
    };
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

    const docs = objects.map(doc => {
      return { _type: get(doc, 'type'), _id: get(doc, 'id') };
    });

    const response = await this._withKibanaIndex('mget', { body: { docs } })
      .then(resp => get(resp, 'docs', []).filter(resp => resp.found));

    return {
      saved_objects: response.map(r => {
        return {
          id: r._id,
          type: r._type,
          version: r._version,
          attributes: r._source
        };
      })
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
    const response = await this._withKibanaIndex('update', {
      type,
      id,
      version: options.version,
      body: {
        doc: attributes
      },
      refresh: 'wait_for'
    });

    return {
      id: id,
      type: type,
      version: get(response, '_version'),
      attributes: attributes
    };
  }

  async _withKibanaIndex(method, params) {
    try {
      return await this._callAdminCluster(method, {
        ...params,
        index: this._kibanaIndex,
      });
    } catch (err) {
      throw handleEsError(err);
    }
  }
}
