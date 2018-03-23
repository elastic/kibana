import uuid from 'uuid';
import _ from 'lodash';

import { getRootType } from '../../mappings';

import {
  getSearchDsl,
  trimIdPrefix,
  includedFields,
  decorateEsError,
  errors,
  Join,
  validateAttributes,
  validateBulkObjects,
} from './lib';

export class SavedObjectsClient {
  constructor(options) {
    const {
      index,
      mappings,
      callCluster,
      onBeforeWrite = () => {},
    } = options;

    this._index = index;
    this._mappings = mappings;
    this._type = getRootType(this._mappings);
    this._onBeforeWrite = onBeforeWrite;
    this._unwrappedCallCluster = callCluster;
  }

  /**
   * ## SavedObjectsClient errors
   *
   * Since the SavedObjectsClient has its hands in everything we
   * are a little paranoid about the way we present errors back to
   * to application code. Ideally, all errors will be either:
   *
   *   1. Caused by bad implementation (ie. undefined is not a function) and
   *      as such unpredictable
   *   2. An error that has been classified and decorated appropriately
   *      by the decorators in `./lib/errors`
   *
   * Type 1 errors are inevitable, but since all expected/handle-able errors
   * should be Type 2 the `isXYZError()` helpers exposed at
   * `savedObjectsClient.errors` should be used to understand and manage error
   * responses from the `SavedObjectsClient`.
   *
   * Type 2 errors are decorated versions of the source error, so if
   * the elasticsearch client threw an error it will be decorated based
   * on its type. That means that rather than looking for `error.body.error.type` or
   * doing substring checks on `error.body.error.reason`, just use the helpers to
   * understand the meaning of the error:
   *
   *   ```js
   *   if (savedObjectsClient.errors.isNotFoundError(error)) {
   *      // handle 404
   *   }
   *
   *   if (savedObjectsClient.errors.isNotAuthorizedError(error)) {
   *      // 401 handling should be automatic, but in case you wanted to know
   *   }
   *
   *   // always rethrow the error unless you handle it
   *   throw error;
   *   ```
   *
   * ### 404s from missing index
   *
   * From the perspective of application code and APIs the SavedObjectsClient is
   * a black box that persists objects. One of the internal details that users have
   * no control over is that we use an elasticsearch index for persistance and that
   * index might be missing.
   *
   * At the time of writing we are in the process of transitioning away from the
   * operating assumption that the SavedObjects index is always available. Part of
   * this transition is handling errors resulting from an index missing. These used
   * to trigger a 500 error in most cases, and in others cause 404s with different
   * error messages.
   *
   * From my (Spencer) perspective, a 404 from the SavedObjectsApi is a 404; The
   * object the request/call was targetting could not be found. This is why #14141
   * takes special care to ensure that 404 errors are generic and don't distinguish
   * between index missing or document missing.
   *
   * ### 503s from missing index
   *
   * Unlike all other methods, create requests are supposed to succeed even when
   * the Kibana index does not exist because it will be automatically created by
   * elasticsearch. When that is not the case it is because Elasticsearch's
   * `action.auto_create_index` setting prevents it from being created automatically
   * so we throw a special 503 with the intention of informing the user that their
   * Elasticsearch settings need to be updated.
   *
   * @type {ErrorHelpers} see ./lib/errors
   */
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
    const validateResult = validateAttributes(attributes);
    if (validateResult.error) {
      throw errors.decorateBadRequestError(validateResult.error);
    }

    const {
      id,
      overwrite = false
    } = options;

    const method = id && !overwrite ? 'create' : 'index';
    const time = this._getCurrentTime();

    try {
      const response = await this._writeToCluster(method, {
        id: this._generateEsId(type, id),
        type: this._type,
        index: this._index,
        refresh: 'wait_for',
        body: this._createBody(type, time, attributes),
      });

      return {
        id: trimIdPrefix(response._id, type),
        type,
        updated_at: time,
        version: response._version,
        attributes
      };
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
   * @param {array} objects - [{ type, id, attributes }]
   * @param {object} [options={}]
   * @property {boolean} [options.overwrite=false] - overwrites existing documents
   * @returns {promise} - [{ id, type, version, attributes, error: { message } }]
   */
  async bulkCreate(objects, options = {}) {
    const validateResult = validateBulkObjects(options);
    if (validateResult.error) {
      throw errors.decorateBadRequestError(validateResult.error);
    }

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
        this._createBody(object.type, time, object.attributes)
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
    const response = await this._writeToCluster('delete', {
      id: this._generateEsId(type, id),
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
      throw errors.createGenericNotFoundError();
    }

    throw new Error(
      `Unexpected Elasticsearch DELETE response: ${JSON.stringify({ type, id, response, })}`
    );
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
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes, join }], total, per_page, page }
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
      tags,
      join: joinTypes,
    } = options;

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
        ...getSearchDsl(this._mappings, {
          search,
          searchFields,
          type,
          sortField,
          sortOrder,
          tags,
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

    let join;
    if (joinTypes) {
      join = new Join(
        joinTypes,
        async (bulkGetObjects) => { return await this.bulkGet(bulkGetObjects); }
      );
      await join.prepareJoin(response.hits.hits);
    }

    return {
      page,
      per_page: perPage,
      total: response.hits.total,
      saved_objects: response.hits.hits.map(hit => {
        const { type, updated_at: updatedAt } = hit._source;
        const savedObject = {
          id: trimIdPrefix(hit._id, type),
          type,
          ...updatedAt && { updated_at: updatedAt },
          version: hit._version,
          attributes: this._getAttributes(type, hit._source),
        };
        if (join) {
          savedObject.join = join.getJoined(hit);
        }
        return savedObject;
      }),
    };
  }

  /**
   * Returns an array of objects by id
   *
   * @param {array} objects - an array ids, or an array of objects containing id and optionally type
   * @param {object} [options={}]
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes, join }] }
   * @example
   *
   * bulkGet([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   */
  async bulkGet(objects = [], options = {}) {
    const {
      join: joinTypes,
    } = options;

    if (objects.length === 0) {
      return { saved_objects: [] };
    }

    const response = await this._callCluster('mget', {
      index: this._index,
      body: {
        docs: objects.map(object => ({
          _id: this._generateEsId(object.type, object.id),
          _type: this._type,
        }))
      }
    });

    let join;
    if (joinTypes) {
      join = new Join(
        joinTypes,
        async (bulkGetObjects) => { return await this.bulkGet(bulkGetObjects); }
      );
      await join.prepareJoin(response.docs);
    }

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
        const savedObject = {
          id,
          type,
          ...time && { updated_at: time },
          version: doc._version,
          attributes: this._getAttributes(type, doc._source)
        };
        if (join) {
          savedObject.join = join.getJoined(doc);
        }
        return savedObject;
      })
    };
  }

  /**
   * Gets a single object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} [options={}]
   * @returns {promise} - { id, type, version, attributes, join }
   */
  async get(type, id, options = {}) {
    const {
      join: joinTypes,
    } = options;

    const response = await this._callCluster('get', {
      id: this._generateEsId(type, id),
      type: this._type,
      index: this._index,
      ignore: [404]
    });

    const docNotFound = response.found === false;
    const indexNotFound = response.status === 404;
    if (docNotFound || indexNotFound) {
      // see "404s from missing index" above
      throw errors.createGenericNotFoundError();
    }

    let join;
    if (joinTypes) {
      join = new Join(
        joinTypes,
        async (bulkGetObjects) => { return await this.bulkGet(bulkGetObjects); }
      );
      await join.prepareJoin([response]);
    }

    const { updated_at: updatedAt } = response._source;

    const savedObject = {
      id,
      type,
      ...updatedAt && { updated_at: updatedAt },
      version: response._version,
      attributes: this._getAttributes(type, response._source)
    };
    if (join) {
      savedObject.join = join.getJoined(response);
    }
    return savedObject;
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
    const validateResult = validateAttributes(attributes);
    if (validateResult.error) {
      throw errors.decorateBadRequestError(validateResult.error);
    }

    const time = this._getCurrentTime();
    const response = await this._writeToCluster('update', {
      id: this._generateEsId(type, id),
      type: this._type,
      index: this._index,
      version: options.version,
      refresh: 'wait_for',
      ignore: [404],
      body: {
        doc: this._createBody(type, time, attributes)
      },
    });

    if (response.status === 404) {
      // see "404s from missing index" above
      throw errors.createGenericNotFoundError();
    }

    return {
      id,
      type,
      updated_at: time,
      version: response._version,
      attributes
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

  _generateEsId(type, id) {
    return `${type}:${id || uuid.v1()}`;
  }

  _getCurrentTime() {
    return new Date().toISOString();
  }

  _createBody(type, time, attributes) {
    const body = {
      type,
      updated_at: time,
      [type]: _.cloneDeep(attributes)
    };
    // Tags are stored as a top level property but appear in attributes to the application.
    // Host the tags property for storage
    if (attributes.tags) {
      body.tags = attributes.tags;
      delete body[type].tags;
    }
    return body;
  }

  _getAttributes(type, source) {
    const attributes = _.cloneDeep(source[type]);
    if (source.tags) {
      attributes.tags = source.tags;
    }
    return attributes;
  }
}
