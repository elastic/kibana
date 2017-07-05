import Boom from 'boom';
import { get } from 'lodash';

import {
  createFindQuery,
  createIdQuery,
  handleEsError,
  isSingleTypeError,
  getDocType,
  v5BulkCreate,
  v6BulkCreate
} from './lib';

const V6_TYPE = 'doc';

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
    const response = await this._withKibanaIndexAndMappingFallback(method, {
      type,
      id: options.id,
      body: attributes,
      refresh: 'wait_for'
    }, {
      type: V6_TYPE,
      body: {
        type,
        [type]: attributes
      }
    });

    return {
      id: response._id,
      type,
      version: response._version,
      attributes
    };
  }

  /**
   * Creates multiple documents at once
   *
   * @param {array} objects - [{ type, id, attributes }]
   * @param {object} [options={}]
   * @property {boolean} [options.force=false] - overrides existing documents
   * @property {string} [options.format=v5]
   * @returns {promise} - [{ id, type, version, attributes, error: { message } }]
   */
  async bulkCreate(objects, options = {}) {
    const { format = 'v5' } = options;

    const bulkCreate = format === 'v5' ? v5BulkCreate : v6BulkCreate;
    const response = await this._withKibanaIndex('bulk', {
      body: bulkCreate(objects, options),
      refresh: 'wait_for'
    });

    const items = get(response, 'items', []);
    const missingTypesCount = items.filter(item => {
      const method = Object.keys(item)[0];
      return isSingleTypeError(get(item, `${method}.error`));
    }).length;

    const formatFallback = format === 'v5' && items.length > 0 && items.length === missingTypesCount;

    if (formatFallback) {
      return this.bulkCreate(objects, Object.assign({}, options, { format: 'v6' }));
    }

    return get(response, 'items', []).map((resp, i) => {
      const method = Object.keys(resp)[0];

      return {
        id: resp[method]._id,
        type: resp[method]._type,
        version: resp[method]._version,
        attributes: objects[i].attributes,
        error: resp[method].error ? { message: get(resp[method], 'error.reason') } : undefined
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
    const response = await this._withKibanaIndex('deleteByQuery', {
      body: createIdQuery({ type, id }),
      refresh: 'wait_for'
    });

    if (get(response, 'deleted') === 0) {
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
      _source: fields,
      size: perPage,
      from: perPage * (page - 1),
      body: createFindQuery({ search, searchFields, type })
    };

    const response = await this._withKibanaIndex('search', esOptions);

    return {
      saved_objects: get(response, 'hits.hits', []).map(r => {
        const docType =  getDocType(r);
        return {
          id: r._id,
          type: docType,
          version: r._version,
          attributes: get(r, `_source.${docType}`) || r._source
        };
      }),
      total: get(response, 'hits.total', 0),
      per_page: perPage,
      page

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

    const docs = objects.reduce((acc, { type, id }) => {
      return [...acc, {}, createIdQuery({ type, id })];
    }, []);

    const response = await this._withKibanaIndex('msearch', { body: docs });
    const responses = get(response, 'responses', []);

    return {
      saved_objects: responses.map(r => {
        const [hit] = get(r, 'hits.hits', []);
        const docType =  getDocType(hit);

        return {
          id: hit._id,
          type: docType,
          version: hit._version,
          attributes: get(hit, `_source.${docType}`) || hit._source
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
    const response = await this._withKibanaIndex('search', { body: createIdQuery({ type, id }) });
    const [hit] = get(response, 'hits.hits', []);

    if (!hit) {
      throw Boom.notFound();
    }

    const attributes =  get(hit, `_source.${type}`) || hit._source;

    return {
      id: hit._id,
      type,
      version: hit._version,
      attributes
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
    const response = await this._withKibanaIndexAndMappingFallback('update', {
      id,
      type,
      version: options.version,
      refresh: 'wait_for',
      body: {
        doc: attributes
      }
    }, {
      type: V6_TYPE,
      body: {
        doc: {
          [type]: attributes
        }
      }
    });

    return {
      id: id,
      type: type,
      version: get(response, '_version'),
      attributes: attributes
    };
  }

  _withKibanaIndexAndMappingFallback(method, params, fallbackParams) {
    const fallbacks = {
      'create': ['is_single_type'],
      'index': ['is_single_type'],
      'update': ['document_missing_exception']
    };

    return this._withKibanaIndex(method, params).catch(err => {
      if (get(fallbacks, method, []).includes(get(err, 'data.type'))) {
        return this._withKibanaIndex(method, Object.assign({}, params, fallbackParams));
      }
    });
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
