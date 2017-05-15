import Boom from 'boom';
import { get, omit, pick } from 'lodash';

import {
  createFindQuery,
  createFilterPath,
  handleEsError,
} from './lib';

export class SavedObjectsClient {
  constructor(kibanaIndex, request, callWithRequest) {
    this._kibanaIndex = kibanaIndex;
    this._request = request;
    this._callWithRequest = callWithRequest;
  }

  async create(type, options = {}) {
    const body = omit(options, 'id');
    const id = get(options, 'id');
    const method = id ? 'create' : 'index';

    const response = await this._withKibanaIndex(method, {
      type,
      id,
      body
    });

    return Object.assign({ type: response._type, id: response._id }, body);
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
    const { search, searchFields, type, fields } = options;
    const esOptions = pick(options, ['type']);
    const perPage = get(options, 'per_page', 20);
    const page = get(options, 'page', 1);

    if (fields) {
      esOptions.filterPath = createFilterPath(fields);
    }

    esOptions.size = perPage;
    esOptions.from = esOptions.size * (page - 1);
    esOptions.body = createFindQuery({ search, searchFields, type });

    const response = await this._withKibanaIndex('search', esOptions);

    return {
      data: get(response, 'hits.hits', []).map(r => {
        return Object.assign({ id: r._id, type: r._type }, r._source);
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

    return Object.assign({ id: response._id, type: response._type }, response._source);
  }

  async update(type, id, body) {
    const response = await this._withKibanaIndex('update', {
      type,
      id,
      body: {
        doc: body
      },
      refresh: 'wait_for'
    });

    return get(response, 'result') === 'updated';
  }

  async _withKibanaIndex(method, params) {
    try {
      return await this._callWithRequest(this._request, method, {
        ...params,
        index: this._kibanaIndex,
      });
    } catch (err) {
      throw handleEsError(err);
    }
  }
}
