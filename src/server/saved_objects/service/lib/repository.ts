/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import uuid from 'uuid';

import { EsMappings, getRootType } from '../../../mappings';
import { decorateEsError } from './decorate_es_error';
import * as errors from './errors';
import { includedFields } from './included_fields';
import { getSearchDsl } from './search_dsl';
import { trimIdPrefix } from './trim_id_prefix';

// BEWARE: The SavedObjectClient depends on the implementation details of the SavedObjectsRepository
// so any breaking changes to this repository are considered breaking changes to the SavedObjectsClient.

interface AnyObject {
  [key: string]: any;
}

export interface SavedObjectsRepositoryOptions {
  index: string;
  mappings: EsMappings;
  callCluster: <T extends AnyObject>(method: string, params?: AnyObject) => Promise<T>;
  onBeforeWrite: () => void | Promise<void>;
}

interface UpdateOptions {
  version?: number;
}

interface BulkGetObject {
  id: string;
  type: string;
}

interface BulkCreateObject {
  type: string;
  id: string;
  attributes: AnyObject;
}

interface BulkCreateOptions {
  overwrite?: boolean;
}

interface NotFoundResponse {
  found: false;
  status?: number;
}

interface FindOptions {
  type?: string | string[];
  search?: string;
  /**
   * see Elasticsearch Simple Query String "query" argument for more information
   */
  searchFields?: string[];
  page?: number;
  perPage?: number;
  sortField?: string;
  sortOrder?: string;
  fields?: string[];
}

function isNotFoundResponse(response: any): response is NotFoundResponse {
  const docNotFound = response.found === false;
  const indexNotFound = response.status === 404;
  return docNotFound || indexNotFound;
}

export class SavedObjectsRepository {
  private index: string;
  private mappings: EsMappings;
  private type = getRootType(this.mappings);
  private onBeforeWrite: SavedObjectsRepositoryOptions['onBeforeWrite'];
  private unwrappedCallCluster: SavedObjectsRepositoryOptions['callCluster'];

  constructor(options: SavedObjectsRepositoryOptions) {
    const {
      index,
      mappings,
      callCluster,
      onBeforeWrite = () => {
        // noop
      },
    } = options;

    this.index = index;
    this.mappings = mappings;
    this.onBeforeWrite = onBeforeWrite;
    this.unwrappedCallCluster = callCluster;
  }

  /**
   * Persist an object
   * @param type
   * @param attributes
   * @param options
   */
  public async create(
    type: string,
    attributes: AnyObject = {},
    options: { id?: string; overwrite?: boolean } = {}
  ) {
    const { id, overwrite = false } = options;

    const method = id && !overwrite ? 'create' : 'index';
    const time = this.getCurrentTime();

    try {
      interface Response {
        _id: string;
        _version: number;
      }

      const response: Response = await this.writeToCluster(method, {
        id: this.generateEsId(type, id),
        type: this.type,
        index: this.index,
        refresh: 'wait_for',
        body: {
          type,
          updated_at: time,
          [type]: attributes,
        },
      });

      return {
        id: trimIdPrefix(response._id, type),
        type,
        updated_at: time,
        version: response._version,
        attributes,
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
   * Create multiple documents at once
   * @param objects object specifications
   * @param options
   */
  public async bulkCreate(objects: BulkCreateObject[], options: BulkCreateOptions = {}) {
    const { overwrite = false } = options;
    const time = this.getCurrentTime();

    const objectToBulkRequest = (object: BulkCreateObject) => {
      const method = object.id && !overwrite ? 'create' : 'index';

      return [
        {
          [method]: {
            _id: this.generateEsId(object.type, object.id),
            _type: this.type,
          },
        },
        {
          type: object.type,
          updated_at: time,
          [object.type]: object.attributes,
        },
      ];
    };

    interface Response {
      items: Array<{
        method: {
          error?: {
            type: string;
            reason?: string;
          };

          _id: string;
          _version: number;
        };
      }>;
    }

    const { items }: Response = await this.writeToCluster('bulk', {
      index: this.index,
      refresh: 'wait_for',
      body: objects.reduce((acc, object) => [...acc, ...objectToBulkRequest(object)], [] as Array<
        ReturnType<typeof objectToBulkRequest>[0] | ReturnType<typeof objectToBulkRequest>[1]
      >),
    });

    return {
      saved_objects: items.map((response, i) => {
        const { error, _id: responseId, _version: version } = Object.values(response)[0];

        const { id = responseId, type, attributes } = objects[i];

        if (error) {
          if (error.type === 'version_conflict_engine_exception') {
            return {
              id,
              type,
              error: { statusCode: 409, message: 'version conflict, document already exists' },
            };
          }
          return {
            id,
            type,
            error: {
              message: error.reason || JSON.stringify(error),
            },
          };
        }

        return {
          id,
          type,
          updated_at: time,
          version,
          attributes,
        };
      }),
    };
  }

  /**
   * Delete an object
   * @param type
   * @param id
   */
  public async delete(type: string, id: string) {
    interface Response {
      result: 'deleted' | 'not_found' | undefined;
      error?: {
        type: string;
      };
    }

    const response: Response = await this.writeToCluster('delete', {
      id: this.generateEsId(type, id),
      type: this.type,
      index: this.index,
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
      throw errors.createGenericNotFoundError(type, id);
    }

    throw new Error(
      `Unexpected Elasticsearch DELETE response: ${JSON.stringify({ type, id, response })}`
    );
  }

  /**
   * Find pages of objects
   * @param options
   */
  public async find(options: FindOptions = {}) {
    const {
      type: filterByType,
      search,
      searchFields,
      page = 1,
      perPage = 20,
      sortField,
      sortOrder,
      fields,
    } = options;

    if (searchFields && !Array.isArray(searchFields)) {
      throw new TypeError('options.searchFields must be an array');
    }

    if (fields && !Array.isArray(fields)) {
      throw new TypeError('options.searchFields must be an array');
    }

    const esOptions = {
      index: this.index,
      size: perPage,
      from: perPage * (page - 1),
      _source: includedFields(filterByType, fields),
      ignore: [404],
      body: {
        version: true,
        ...getSearchDsl(this.mappings, {
          search,
          searchFields,
          type: filterByType,
          sortField,
          sortOrder,
        }),
      },
    };

    interface Response {
      hits: {
        total: number;
        hits: Array<{
          _id: string;
          _version: string;
          _source: {
            type: string;
            updated_at: string;
          };
        }>;
      };
    }

    const response: NotFoundResponse | Response = await this.callCluster('search', esOptions);

    if (isNotFoundResponse(response)) {
      // 404 is only possible here if the index is missing, which
      // we don't want to leak, see "404s from missing index" above
      return {
        page,
        per_page: perPage,
        total: 0,
        saved_objects: [],
      };
    }

    return {
      page,
      per_page: perPage,
      total: response.hits.total,
      saved_objects: response.hits.hits.map(hit => {
        const { type, updated_at: updatedAt } = hit._source;
        return {
          id: trimIdPrefix(hit._id, type),
          type,
          ...(updatedAt && { updated_at: updatedAt }),
          version: hit._version,
          attributes: (hit._source as any)[type] as AnyObject,
        };
      }),
    };
  }

  /**
   * Get a each object decribed by `objects`
   * @param objects
   */
  public async bulkGet(objects: BulkGetObject[] = []) {
    if (objects.length === 0) {
      return { saved_objects: [] };
    }

    interface Response {
      docs: [
        {
          found: boolean;
          _source: AnyObject;
          _version: string;
        }
      ];
    }

    const response: Response = await this.callCluster('mget', {
      index: this.index,
      body: {
        docs: objects.map(object => ({
          _id: this.generateEsId(object.type, object.id),
          _type: this.type,
        })),
      },
    });

    return {
      saved_objects: response.docs.map((doc, i) => {
        const { id, type } = objects[i];

        if (!doc.found) {
          return {
            id,
            type,
            error: { statusCode: 404, message: 'Not found' },
          };
        }

        const time = doc._source.updated_at;
        return {
          id,
          type,
          ...(time && { updated_at: time }),
          version: doc._version,
          attributes: doc._source[type],
        };
      }),
    };
  }

  /**
   * Get a single object
   * @param type
   * @param id
   */
  public async get<Attributes extends AnyObject>(type: string, id: string) {
    interface Response {
      found: true;
      status?: number;
      _version: string;
      _source: AnyObject;
    }

    const response: NotFoundResponse | Response = await this.callCluster('get', {
      id: this.generateEsId(type, id),
      type: this.type,
      index: this.index,
      ignore: [404],
    });

    if (isNotFoundResponse(response)) {
      // see "404s from missing index" above
      throw errors.createGenericNotFoundError(type, id);
    }

    const { updated_at: updatedAt }: { updated_at?: string } = response._source;

    return {
      id,
      type,
      ...(updatedAt ? { updated_at: updatedAt } : {}),
      version: response._version,
      attributes: response._source[type] as Attributes,
    };
  }

  /**
   * Apply a partial update to a single object
   * @param type
   * @param id
   * @param attributes
   * @param options
   */
  public async update<T extends AnyObject>(
    type: string,
    id: string,
    attributes: T,
    options: UpdateOptions = {}
  ) {
    const { version } = options;

    const time = this.getCurrentTime();

    interface Response {
      _version: string;
    }

    const response: NotFoundResponse | Response = await this.writeToCluster('update', {
      id: this.generateEsId(type, id),
      type: this.type,
      index: this.index,
      version,
      refresh: 'wait_for',
      ignore: [404],
      body: {
        doc: {
          updated_at: time,
          [type]: attributes,
        },
      },
    });

    if (isNotFoundResponse(response)) {
      // see "404s from missing index" above
      throw errors.createGenericNotFoundError(type, id);
    }

    return {
      id,
      type,
      updated_at: time,
      version: response._version,
      attributes,
    };
  }

  private async writeToCluster(method: string, params?: AnyObject) {
    try {
      await this.onBeforeWrite();
      return await this.callCluster(method, params);
    } catch (err) {
      throw decorateEsError(err);
    }
  }

  private async callCluster(method: string, params?: AnyObject) {
    try {
      return (await this.unwrappedCallCluster(method, params)) as any;
    } catch (err) {
      throw decorateEsError(err);
    }
  }

  private generateEsId(type: string, id?: string) {
    return `${type}:${id || uuid.v1()}`;
  }

  private getCurrentTime() {
    return new Date().toISOString();
  }
}
