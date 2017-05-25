import Boom from 'boom';
import { get } from 'lodash';

import {
  createFindQuery,
  createIdQuery,
  handleEsError,
  getDocType
} from './lib';

const V6_TYPE = 'doc';
const TYPE_MISSING_EXCEPTION = 'type_missing_exception';

function isTypeMissing(item, action) {
  return get(item, `${action}.error.type`) === TYPE_MISSING_EXCEPTION;
}
function boomIsNotFound(err) {
  return err.isBoom && err.output.statusCode === 404;
}

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
    let response;
    try {
      response = await this._withKibanaIndex(method, {
        type: V6_TYPE,
        body: {
          [type]: attributes
        },
        refresh: 'wait_for'
      });
    } catch(err) {
      if (!boomIsNotFound(err)) throw err;
      response = await this._withKibanaIndex(method, {
        type,
        attributes,
        refresh: 'wait_for'
      });
    }

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
    const action = options.force === true ? 'index' : 'create';
    let response;
    const v6Body = objects.reduce((acc, object) => {
      acc.push({ [action]: { _type: 'doc', _id: object.id } });
      acc.push(Object.assign({}, {
        type: object.type
      }, { [object.type]: object.attributes }));
      return acc;
    }, []);
    response = await this._withKibanaIndex('bulk', { body: v6Body });

    const items = get(response, 'items', []);
    const missingErrors = items.filter(item => isTypeMissing(item, action)).length;
    const usesV5Index = items.length && items.length === missingErrors;

    if (usesV5Index) {
      const v5Body = objects.reduce((acc, object) => {
        acc.push({ [action]: { _type: object.type, _id: object.id } });
        acc.push(object.attributes);
        return acc;
      }, []);
      response = await this._withKibanaIndex('bulk', { body: v5Body });
    }

    return get(response, 'items', []).map((resp, i) => {
      return {
        id: resp[action]._id,
        type: resp[action]._type,
        version: resp[action]._version,
        attributes: objects[i].attributes,
        error: resp[action].error ? { message: get(resp[action], 'error.reason') } : undefined
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
      acc.push({}, createIdQuery({ type, id }));
      return acc;
    }, []);


    const response = await this._withKibanaIndex('msearch', { body: docs })
    .then(resp => {
      let results = [];
      const responses = get(resp, 'responses', []);
      responses.forEach(r => {
        results = results.concat(get(r, 'hits.hits'));
      });
      return results;
    });

    return {
      saved_objects: response.map(r => {
        const docType =  getDocType(r);

        return {
          id: r._id,
          type: docType,
          version: r._version,
          attributes: get(r, `_source.${docType}`) || r._source
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
    const hit = get(response, 'hits.hits.0');
    if (!hit) throw Boom.notFound();

    const attributes =  get(hit, `_source.${type}`) || get(hit, '_source');

    return {
      id: hit._id,
      type: hit._type,
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
    const baseParams = {
      id,
      version: options.version,
      body: {
        doc: attributes
      },
      refresh: 'wait_for'
    };

    let response;
    try {
      const v6Params = Object.assign({}, baseParams, {
        type: V6_TYPE,
        body: {
          doc: {
            [type]: attributes
          }
        },
      });
      response = await this._withKibanaIndex('update', v6Params);
    } catch (err) {
      if (!boomIsNotFound(err)) throw err;
      const v5Params = Object.assign({}, baseParams, {
        type,
        body: {
          doc: attributes
        }
      });
      response = await this._withKibanaIndex('update', v5Params);
    }

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
