import {
  createFindQuery,
  pickEsMethod,
  createTitleConflictError,
  createIdConflictError,
  decodeNextPageId,
  encodeNextPageId,
  handleEsError,
} from './lib';

export class SavedObjectsClient {
  constructor(kibanaIndex, request, callWithRequest) {
    this._kibanaIndex = kibanaIndex;
    this._request = request;
    this._callWithRequest = callWithRequest;
  }

  async get(type, id) {
    return await this._withKibanaIndex('get', {
      type,
      id,
    });
  }

  async delete(type, id) {
    return await this._withKibanaIndex('delete', {
      type,
      id,
      refresh: 'wait_for'
    });
  }

  async find(type, options = {}) {
    const { filter, size } = options;

    try {
      const body = createFindQuery({ filter, size });
      return await this._withKibanaIndex('search', {
        type,
        body
      });
    } catch (error) {
      // attempt to mimic simple_query_string, swallow formatting error
      if (error.status === 400) {
        return {
          hits: {
            total: 0,
            hits: [],
          }
        };
      }

      throw error;
    }
  }

  async getIds(type) {
    const esResp = await this._withKibanaIndex('search', {
      type: type,
      storedFields: [],
      filterPath: ['hits.hits._id', 'hits.total'],
      size: 10000,
    });

    const { hits = [], total = 0 } = (esResp.hits || {});
    return {
      total,
      ids: hits.map(hit => hit._id)
    };
  }

  async mget(reqs) {
    return await this._withKibanaIndex('mget', {
      body: {
        docs: reqs.map(doc => ({
          _id: doc.id,
          _type: doc.type,
        }))
      }
    });
  }

  async isTitleInUse(type, id, title) {
    const query = {
      bool: {
        must: { match_phrase: { title } }
      }
    };

    if (id) {
      query.bool.must_not = { match: { _id: id } };
    }

    // es will return the most relevant results first
    // so exact matches should come first, so we
    // shouldn't need to request everything but we
    // get the first 10 just to be safe
    const size = 10;
    const body = { query };
    const resp = await this._withKibanaIndex('search', {
      type,
      body,
      size
    });

    return resp.hits.hits.some(hit => (
      hit._source.title.toLowerCase() === title.toLowerCase()
    ));
  }

  async save(type, id, body, options = {}) {
    const {
      updateOnly,
      allowTitleConflict,
      allowOverwrite
    } = options;

    const { title } = body;
    if (title && !allowTitleConflict) {
      if (await this.isTitleInUse(type, id, title)) {
        throw createTitleConflictError(type, title);
      }
    }

    const method = pickEsMethod(updateOnly, allowOverwrite, id);
    let esResp;
    try {
      esResp = await this._withKibanaIndex(method, {
        type,
        id,
        // TODO: trigger a refresh in case automatic refresh is disabled
        refresh: true,
        body: method === 'update' ? { doc: body } : body
      });
    } catch (error) {
      if (error.status === 409) {
        throw createIdConflictError();
      }
      throw error;
    }

    const resp = {
      _index: esResp._index,
      _type: esResp._type,
      _id: esResp._id,
      found: true,
    };

    if (method === 'update') {
      const getResp = await this._withKibanaIndex('get', { type, id });
      resp._version = getResp._version;
      resp._source = getResp._source;
    } else {
      resp._version = esResp._version;
      resp._source = body;
    }

    return resp;
  }

  async scanStart(type, options = {}) {
    const {
      pageSize = 10
    } = options;

    const esResp = await this._withKibanaIndex('search', {
      type,
      scroll: '1m',
      size: pageSize,
      body: {
        query: { match_all: {} }
      }
    });

    const { total, hits } = esResp.hits;
    return {
      next_page_id: encodeNextPageId(2, Math.ceil(total / pageSize), esResp._scroll_id),
      total,
      hits,
    };
  }

  async scanNextPage(nextPageId) {
    const { page, pageCount, scrollId } = decodeNextPageId(nextPageId);
    const esResp = await this._withKibanaIndex('scroll', {
      scroll: '1m',
      body: { scroll_id: scrollId },
    });

    const { hits, total } = esResp.hits;
    return {
      next_page_id: encodeNextPageId(page + 1, pageCount, esResp._scroll_id),
      total,
      hits,
    };
  }

  async getDefinedTypes() {
    const esResp = await this._withKibanaIndex('indices.getFieldMapping', {
      type: '*',
      fields: '_source'
    });

    // kbnIndex is not sufficient here, if the kibana indexed
    // is aliased we need to use the root index name as key
    const indexOrAlias = Object.keys(esResp).shift();
    return Object.keys(esResp[indexOrAlias].mappings);
  }

  async defineType(type, mapping) {
    return await this._withKibanaIndex('indices.putMapping', {
      type: type,
      body: {
        [type]: {
          properties: mapping
        }
      }
    });
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
