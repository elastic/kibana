import Boom from 'boom';
import { get, isString } from 'lodash';

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
    const response = await this._withKibanaIndex('index', {
      type,
      body
    });

    return {
      type: response._type,
      id: response._id,
      version: response._version,
      attributes: body
    };
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
   * @param {array} ids - an array ids, or an array of objects containing id and optionally type
   * @param {string} type - applies type to each id
   * @returns {promise} Returns promise containing array of documents
   * @example
   *
   * // single type:
   * bulkGet(['one', 'two', 'config'])
   *
   * // mixed types:
   * bulkGet([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern'
   * ])
   */
  async bulkGet(ids = [], type) {
    const docs = ids.map(doc => {
      const id = isString(doc) ? doc : doc.id;
      return { _type: get(doc, 'type', type), _id: id };
    });

    const response = await this._withKibanaIndex('mget', {
      body: { docs },
    });

    // TODO: how to handle { found: false }
    return get(response, 'docs', []).map(r => {
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
