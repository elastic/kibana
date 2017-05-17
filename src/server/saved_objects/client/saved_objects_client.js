import Boom from 'boom';
import { get, omit } from 'lodash';

import {
  createFindQuery,
  handleEsError,
} from './lib';

export class SavedObjectsClient {
  constructor(kibanaIndex, callAdminCluster) {
    this._kibanaIndex = kibanaIndex;
    this._callAdminCluster = callAdminCluster;
  }

  async create(type, options = {}) {
    const body = omit(options, 'id');

    const response = await this._withKibanaIndex('index', {
      type,
      body
    });

    return Object.assign({
      type: response._type,
      id: response._id,
      version: response._version
    }, body);
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

    return get(response, 'result') === 'deleted';
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
      data: get(response, 'hits.hits', []).map(r => {
        return Object.assign({ id: r._id, type: r._type, version: r._version }, r._source);
      }),
      total: get(response, 'hits.total', 0),
      per_page: perPage,
      page

    };
  }

  async get(type, id) {
    const response = await this._withKibanaIndex('get', {
      type,
      id,
    });

    return Object.assign({
      id: response._id,
      type: response._type,
      version: response._version
    }, response._source);
  }

  async update(type, id, body) {
    const version = get(body, 'version');
    const doc = omit(body, ['version']);

    const response = await this._withKibanaIndex('update', {
      type,
      id,
      version,
      body: {
        doc: doc
      },
      refresh: 'wait_for'
    });

    return { version: get(response, '_version') };
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
