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

  async create(type, body = {}) {
    const response = await this._withKibanaIndex('index', { type, body });

    return {
      id: response._id,
      type: response._type,
      version: response._version,
      attributes: body
    };
  }

  /**
   * Creates multiple documents at once
   *
   * @param {array} objects
   * @param {object} options
   * @param {boolean} options.force - overrides existing documents
   * @returns {promise} Returns promise containing array of documents
   */
  async bulkCreate(objects, options = {}) {
    const action = options.force === true ? 'index' : 'create';

    const body = objects.reduce((acc, object) => {
      acc.push({ [action]: { _type: object.type, _id: object.id } });
      acc.push(object.attributes);

      return acc;
    }, []);

    return await this._withKibanaIndex('bulk', { body })
      .then(resp => get(resp, 'items', []).map((resp, i) => {
        return {
          id: resp[action]._id,
          type: resp[action]._type,
          version: resp[action]._version,
          attributes: objects[i].attributes,
          error: resp[action].error ? { message: get(resp[action], 'error.reason') } : undefined
        };
      }));
  }

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

  async find(options = {}) {
    const {
      search,
      searchFields,
      type,
      fields,
      perPage = 20,
      page = 1,
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
   * Returns an array of objects by id
   *
   * @param {array} objects - an array ids, or an array of objects containing id and optionally type
   * @returns {promise} Returns promise containing array of documents
   * @example
   *
   * bulkGet([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern'
   * ])
   */
  async bulkGet(objects = []) {
    if (objects.length === 0) {
      return [];
    }

    const docs = objects.map(doc => {
      return { _type: get(doc, 'type'), _id: get(doc, 'id') };
    });

    const response = await this._withKibanaIndex('mget', { body: { docs } })
      .then(resp => get(resp, 'docs', []).filter(resp => resp.found));

    return response.map(r => {
      return {
        id: r._id,
        type: r._type,
        version: r._version,
        attributes: r._source
      };
    });
  }

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

  async update(type, id, attributes, options = {}) {
    const response = await this._withKibanaIndex('update', {
      type,
      id,
      version: get(options, 'version'),
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
