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

import { cloneDeep, pick, throttle } from 'lodash';
import { resolve as resolveUrl } from 'url';

import {
  MigrationVersion,
  SavedObject,
  SavedObjectAttributes,
  SavedObjectReference,
  SavedObjectsClient as SavedObjectsApi,
} from '../../../server/saved_objects';
import { FindOptions } from '../../../server/saved_objects/service';
import { isAutoCreateIndexError, showAutoCreateIndexErrorPage } from '../error_auto_create_index';
import { kfetch, KFetchQuery } from '../kfetch';
import { keysToCamelCaseShallow, keysToSnakeCaseShallow } from '../utils/case_conversion';
import { SimpleSavedObject } from './simple_saved_object';

interface RequestParams {
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';
  path: string;
  query?: KFetchQuery;
  body?: object;
}

interface CreateOptions {
  id?: string;
  overwrite?: boolean;
  migrationVersion?: MigrationVersion;
  references?: SavedObjectReference[];
}

interface BulkCreateOptions<T extends SavedObjectAttributes = SavedObjectAttributes>
  extends CreateOptions {
  type: string;
  attributes: T;
}

interface UpdateOptions {
  version?: string;
  migrationVersion?: MigrationVersion;
  references?: SavedObjectReference[];
}

interface BatchResponse<T extends SavedObjectAttributes = SavedObjectAttributes> {
  savedObjects: Array<SimpleSavedObject<T>>;
}

interface FindResults<T extends SavedObjectAttributes = SavedObjectAttributes>
  extends BatchResponse<T> {
  total: number;
  perPage: number;
  page: number;
}

interface BatchQueueEntry {
  type: string;
  id: string;
  resolve: <T extends SavedObjectAttributes>(value: SimpleSavedObject<T> | SavedObject<T>) => void;
  reject: (reason?: any) => void;
}

const join = (...uriComponents: Array<string | undefined>) =>
  uriComponents
    .filter((comp): comp is string => Boolean(comp))
    .map(encodeURIComponent)
    .join('/');

/**
 * Interval that requests are batched for
 * @type {integer}
 */
const BATCH_INTERVAL = 100;

const API_BASE_URL = '/api/saved_objects/';

/**
 * The SavedObjectsClient class acts as a generic data fetcher
 * and data saver for saved objects regardless of type.
 *
 * If possible, this class should be used to load saved objects
 * instead of the SavedObjectLoader class which implements some
 * additional functionality.
 */
export class SavedObjectsClient {
  /**
   * Throttled processing of get requests into bulk requests at 100ms interval
   */
  private processBatchQueue = throttle(
    () => {
      const queue = cloneDeep(this.batchQueue);
      this.batchQueue = [];

      this.bulkGet(queue)
        .then(({ savedObjects }) => {
          queue.forEach(queueItem => {
            const foundObject = savedObjects.find(savedObject => {
              return savedObject.id === queueItem.id && savedObject.type === queueItem.type;
            });

            if (!foundObject) {
              return queueItem.resolve(this.createSavedObject(pick(queueItem, ['id', 'type'])));
            }

            queueItem.resolve(foundObject);
          });
        })
        .catch(err => {
          queue.forEach(queueItem => {
            queueItem.reject(err);
          });
        });
    },
    BATCH_INTERVAL,
    { leading: false }
  );

  private batchQueue: BatchQueueEntry[];

  constructor() {
    this.batchQueue = [];
  }

  /**
   * Persists an object
   *
   * @param {string} type
   * @param {object} [attributes={}]
   * @param {object} [options={}]
   * @property {string} [options.id] - force id on creation, not recommended
   * @property {boolean} [options.overwrite=false]
   * @property {object} [options.migrationVersion]
   * @returns
   */
  public create = <T extends SavedObjectAttributes>(
    type: string,
    attributes: T,
    options: CreateOptions = {}
  ): Promise<SimpleSavedObject<T>> => {
    if (!type || !attributes) {
      return Promise.reject(new Error('requires type and attributes'));
    }

    const path = this.getPath([type, options.id]);
    const query = {
      overwrite: options.overwrite,
    };

    const createRequest: Promise<SavedObject<T>> = this.request({
      method: 'POST',
      path,
      query,
      body: {
        attributes,
        migrationVersion: options.migrationVersion,
        references: options.references,
      },
    });

    return createRequest
      .then(resp => this.createSavedObject(resp))
      .catch((error: object) => {
        if (isAutoCreateIndexError(error)) {
          showAutoCreateIndexErrorPage();
        }

        throw error;
      });
  };

  /**
   * Creates multiple documents at once
   *
   * @param {array} objects - [{ type, id, attributes, references, migrationVersion }]
   * @param {object} [options={}]
   * @property {boolean} [options.overwrite=false]
   * @returns The result of the create operation containing created saved objects.
   */
  public bulkCreate = (objects: BulkCreateOptions[] = [], options: KFetchQuery = {}) => {
    const path = this.getPath(['_bulk_create']);
    const query = pick(options, ['overwrite']) as Pick<KFetchQuery, 'overwrite'>;

    const request: ReturnType<SavedObjectsApi['bulkCreate']> = this.request({
      method: 'POST',
      path,
      query,
      body: objects,
    });
    return request.then(resp => {
      resp.saved_objects = resp.saved_objects.map(d => this.createSavedObject(d));
      return keysToCamelCaseShallow(resp) as BatchResponse;
    });
  };

  /**
   * Deletes an object
   *
   * @param type
   * @param id
   * @returns
   */
  public delete = (type: string, id: string): ReturnType<SavedObjectsApi['delete']> => {
    if (!type || !id) {
      return Promise.reject(new Error('requires type and id'));
    }

    return this.request({ method: 'DELETE', path: this.getPath([type, id]) });
  };

  /**
   * Search for objects
   *
   * @param {object} [options={}]
   * @property {string} options.type
   * @property {string} options.search
   * @property {string} options.searchFields - see Elasticsearch Simple Query String
   *                                        Query field argument for more information
   * @property {integer} [options.page=1]
   * @property {integer} [options.perPage=20]
   * @property {array} options.fields
   * @property {object} [options.hasReference] - { type, id }
   * @returns A find result with objects matching the specified search.
   */
  public find = <T extends SavedObjectAttributes>(
    options: FindOptions = {}
  ): Promise<FindResults<T>> => {
    const path = this.getPath(['_find']);
    const query = keysToSnakeCaseShallow(options);

    const request: ReturnType<SavedObjectsApi['find']> = this.request({
      method: 'GET',
      path,
      query,
    });
    return request.then(resp => {
      resp.saved_objects = resp.saved_objects.map(d => this.createSavedObject(d));
      return keysToCamelCaseShallow(resp) as FindResults<T>;
    });
  };

  /**
   * Fetches a single object
   *
   * @param {string} type
   * @param {string} id
   * @returns The saved object for the given type and id.
   */
  public get = <T extends SavedObjectAttributes>(
    type: string,
    id: string
  ): Promise<SimpleSavedObject<T>> => {
    if (!type || !id) {
      return Promise.reject(new Error('requires type and id'));
    }

    return new Promise((resolve, reject) => {
      this.batchQueue.push({ type, id, resolve, reject } as BatchQueueEntry);
      this.processBatchQueue();
    });
  };

  /**
   * Returns an array of objects by id
   *
   * @param {array} objects - an array ids, or an array of objects containing id and optionally type
   * @returns The saved objects with the given type and ids requested
   * @example
   *
   * bulkGet([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   */
  public bulkGet = (objects: Array<{ id: string; type: string }> = []) => {
    const path = this.getPath(['_bulk_get']);
    const filteredObjects = objects.map(obj => pick(obj, ['id', 'type']));

    const request: ReturnType<SavedObjectsApi['bulkGet']> = this.request({
      method: 'POST',
      path,
      body: filteredObjects,
    });
    return request.then(resp => {
      resp.saved_objects = resp.saved_objects.map(d => this.createSavedObject(d));
      return keysToCamelCaseShallow(resp) as BatchResponse;
    });
  };

  /**
   * Updates an object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} attributes
   * @param {object} options
   * @prop {integer} options.version - ensures version matches that of persisted object
   * @prop {object} options.migrationVersion - The optional migrationVersion of this document
   * @returns
   */
  public update<T extends SavedObjectAttributes>(
    type: string,
    id: string,
    attributes: T,
    { version, migrationVersion, references }: UpdateOptions = {}
  ): Promise<SimpleSavedObject<T>> {
    if (!type || !id || !attributes) {
      return Promise.reject(new Error('requires type, id and attributes'));
    }

    const path = this.getPath([type, id]);
    const body = {
      attributes,
      migrationVersion,
      references,
      version,
    };

    return this.request({
      method: 'PUT',
      path,
      body,
    }).then((resp: SavedObject<T>) => {
      return this.createSavedObject(resp);
    });
  }

  private createSavedObject<T extends SavedObjectAttributes>(
    options: SavedObject<T>
  ): SimpleSavedObject<T> {
    return new SimpleSavedObject(this, options);
  }

  private getPath(path: Array<string | undefined>): string {
    return resolveUrl(API_BASE_URL, join(...path));
  }

  private request({ method, path, query, body }: RequestParams) {
    if (method === 'GET' && body) {
      return Promise.reject(new Error('body not permitted for GET requests'));
    }

    return kfetch({ method, pathname: path, query, body: JSON.stringify(body) });
  }
}
