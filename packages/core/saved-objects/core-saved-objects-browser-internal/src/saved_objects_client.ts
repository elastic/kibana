/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pick, throttle, cloneDeep } from 'lodash';
import type { HttpSetup, HttpFetchOptions } from '@kbn/core-http-browser';
import type { SavedObject, SavedObjectTypeIdTuple } from '@kbn/core-saved-objects-common';
import type {
  SavedObjectsBulkResolveResponse as SavedObjectsBulkResolveResponseServer,
  SavedObjectsBulkDeleteResponse as SavedObjectsBulkDeleteResponseServer,
  SavedObjectsClientContract as SavedObjectsApi,
  SavedObjectsFindResponse as SavedObjectsFindResponseServer,
  SavedObjectsResolveResponse,
  SavedObjectsBulkDeleteOptions,
} from '@kbn/core-saved-objects-api-server';
import type {
  SavedObjectsClientContract,
  SavedObjectsCreateOptions,
  SavedObjectsDeleteOptions,
  SavedObjectsBatchResponse,
  SavedObjectsFindOptions,
  SavedObjectsUpdateOptions,
  ResolvedSimpleSavedObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsFindResponse,
  SavedObjectsBulkCreateOptions,
  SavedObjectsBulkCreateObject,
  SimpleSavedObject,
  SavedObjectsBulkDeleteResponse,
} from '@kbn/core-saved-objects-api-browser';

import { SimpleSavedObjectImpl } from './simple_saved_object';

type PromiseType<T extends Promise<any>> = T extends Promise<infer U> ? U : never;

type SavedObjectsFindResponseInternal = Omit<SavedObjectsFindResponseServer, 'pit_id'>;

interface BatchGetQueueEntry {
  type: string;
  id: string;
  resolve: <T = unknown>(value: SimpleSavedObject<T> | SavedObject<T>) => void;
  reject: (reason?: any) => void;
}

interface BatchResolveQueueEntry {
  type: string;
  id: string;
  resolve: <T = unknown>(value: ResolvedSimpleSavedObject<T>) => void;
  reject: (reason?: any) => void;
}

const joinUriComponents = (...uriComponents: Array<string | undefined>) =>
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

const getObjectsToFetch = (queue: BatchGetQueueEntry[]): SavedObjectTypeIdTuple[] => {
  const objects: SavedObjectTypeIdTuple[] = [];
  const inserted = new Set<string>();
  queue.forEach(({ id, type }) => {
    if (!inserted.has(`${type}|${id}`)) {
      objects.push({ id, type });
      inserted.add(`${type}|${id}`);
    }
  });
  return objects;
};

const getObjectsToResolve = (queue: BatchResolveQueueEntry[]) => {
  const responseIndices: number[] = [];
  const objectsToResolve: SavedObjectTypeIdTuple[] = [];
  const inserted = new Map<string, number>();
  queue.forEach(({ id, type }) => {
    const key = `${type}|${id}`;
    const indexForTypeAndId = inserted.get(key);
    if (indexForTypeAndId === undefined) {
      inserted.set(key, objectsToResolve.length);
      responseIndices.push(objectsToResolve.length);
      objectsToResolve.push({ id, type });
    } else {
      responseIndices.push(indexForTypeAndId);
    }
  });
  return { objectsToResolve, responseIndices };
};

/**
 * Saved Objects is Kibana's data persistence mechanism allowing plugins to
 * use Elasticsearch for storing plugin state. The client-side
 * SavedObjectsClient is a thin convenience library around the SavedObjects
 * HTTP API for interacting with Saved Objects.
 *
 * @internal
 * @deprecated See https://github.com/elastic/dev/issues/2194
 */
export class SavedObjectsClient implements SavedObjectsClientContract {
  private http: HttpSetup;
  private batchGetQueue: BatchGetQueueEntry[];
  private batchResolveQueue: BatchResolveQueueEntry[];

  /**
   * Throttled processing of get requests into bulk requests at 100ms interval
   */
  private processBatchGetQueue = throttle(
    async () => {
      const queue = [...this.batchGetQueue];
      this.batchGetQueue = [];

      try {
        const objectsToFetch = getObjectsToFetch(queue);
        const { saved_objects: savedObjects } = await this.performBulkGet(objectsToFetch);

        queue.forEach((queueItem) => {
          const foundObject = savedObjects.find((savedObject) => {
            return savedObject.id === queueItem.id && savedObject.type === queueItem.type;
          });

          if (foundObject) {
            // multiple calls may have been requested the same object.
            // we need to clone to avoid sharing references between the instances
            queueItem.resolve(this.createSavedObject(cloneDeep(foundObject)));
          } else {
            queueItem.resolve(
              this.createSavedObject(pick(queueItem, ['id', 'type']) as SavedObject)
            );
          }
        });
      } catch (err) {
        queue.forEach((queueItem) => {
          queueItem.reject(err);
        });
      }
    },
    BATCH_INTERVAL,
    { leading: false }
  );

  /**
   * Throttled processing of resolve requests into bulk requests at 100ms interval
   */
  private processBatchResolveQueue = throttle(
    async () => {
      const queue = [...this.batchResolveQueue];
      this.batchResolveQueue = [];

      try {
        const { objectsToResolve, responseIndices } = getObjectsToResolve(queue);
        const { resolved_objects: resolvedObjects } = await this.performBulkResolve(
          objectsToResolve
        );

        queue.forEach((queueItem, i) => {
          // This differs from the older processBatchGetQueue approach because the resolved object IDs are *not* guaranteed to be the same.
          // Instead, we rely on the guarantee that the objects in the bulkResolve response will be in the same order as the requests.
          // However, we still need to clone the response object because we deduplicate batched requests.
          const responseIndex = responseIndices[i];
          const clone = cloneDeep(resolvedObjects[responseIndex]);
          queueItem.resolve(this.createResolvedSavedObject(clone));
        });
      } catch (err) {
        queue.forEach((queueItem) => {
          queueItem.reject(err);
        });
      }
    },
    BATCH_INTERVAL,
    { leading: false }
  );

  /** @internal */
  constructor(http: HttpSetup) {
    this.http = http;
    this.batchGetQueue = [];
    this.batchResolveQueue = [];
  }

  public create = <T = unknown>(
    type: string,
    attributes: T,
    options: SavedObjectsCreateOptions = {}
  ): Promise<SimpleSavedObject<T>> => {
    if (!type || !attributes) {
      return Promise.reject(new Error('requires type and attributes'));
    }

    const path = this.getPath([type, options.id]);
    const query = {
      overwrite: options.overwrite,
    };

    const createRequest = this.savedObjectsFetch<SavedObject<T>>(path, {
      method: 'POST',
      query,
      body: JSON.stringify({
        attributes,
        migrationVersion: options.migrationVersion,
        references: options.references,
      }),
    });

    return createRequest.then((resp) => this.createSavedObject(resp));
  };

  /**
   * Creates multiple documents at once
   *
   * @param {array} objects - [{ type, id, attributes, references, migrationVersion }]
   * @param {object} [options={}]
   * @property {boolean} [options.overwrite=false]
   * @returns The result of the create operation containing created saved objects.
   */
  public bulkCreate = (
    objects: SavedObjectsBulkCreateObject[] = [],
    options: SavedObjectsBulkCreateOptions = { overwrite: false }
  ) => {
    const path = this.getPath(['_bulk_create']);
    const query = { overwrite: options.overwrite };

    const request: ReturnType<SavedObjectsApi['bulkCreate']> = this.savedObjectsFetch(path, {
      method: 'POST',
      query,
      body: JSON.stringify(objects),
    });
    return request.then((resp) => {
      resp.saved_objects = resp.saved_objects.map((d) => this.createSavedObject(d));
      return renameKeys<
        PromiseType<ReturnType<SavedObjectsApi['bulkCreate']>>,
        SavedObjectsBatchResponse
      >({ saved_objects: 'savedObjects' }, resp) as SavedObjectsBatchResponse;
    });
  };

  public delete = (
    type: string,
    id: string,
    options?: SavedObjectsDeleteOptions
  ): ReturnType<SavedObjectsApi['delete']> => {
    if (!type || !id) {
      return Promise.reject(new Error('requires type and id'));
    }

    const query = {
      force: !!options?.force,
    };

    return this.savedObjectsFetch(this.getPath([type, id]), { method: 'DELETE', query });
  };

  public bulkDelete = async (
    objects: SavedObjectTypeIdTuple[],
    options?: SavedObjectsBulkDeleteOptions
  ): Promise<SavedObjectsBulkDeleteResponse> => {
    const filteredObjects = objects.map(({ type, id }) => ({ type, id }));
    const queryOptions = { force: !!options?.force };
    const response = await this.performBulkDelete(filteredObjects, queryOptions);
    return {
      statuses: response.statuses,
    };
  };

  private async performBulkDelete(
    objects: SavedObjectTypeIdTuple[],
    queryOptions: { force: boolean }
  ) {
    const path = this.getPath(['_bulk_delete']);
    const request: Promise<SavedObjectsBulkDeleteResponseServer> = this.savedObjectsFetch(path, {
      method: 'POST',
      body: JSON.stringify(objects),
      query: queryOptions,
    });
    return request;
  }

  public find = <T = unknown, A = unknown>(
    options: SavedObjectsFindOptions
  ): Promise<SavedObjectsFindResponse<T>> => {
    const path = this.getPath(['_find']);
    const renameMap = {
      defaultSearchOperator: 'default_search_operator',
      fields: 'fields',
      hasReference: 'has_reference',
      hasReferenceOperator: 'has_reference_operator',
      hasNoReference: 'has_no_reference',
      hasNoReferenceOperator: 'has_no_reference_operator',
      page: 'page',
      perPage: 'per_page',
      search: 'search',
      searchFields: 'search_fields',
      sortField: 'sort_field',
      type: 'type',
      filter: 'filter',
      aggs: 'aggs',
      namespaces: 'namespaces',
      preference: 'preference',
    };

    const renamedQuery = renameKeys<SavedObjectsFindOptions, any>(renameMap, options);
    const query = pick.apply(null, [renamedQuery, ...Object.values<string>(renameMap)]) as Record<
      string,
      any
    >;

    // `has_references` is a structured object. we need to stringify it before sending it, as `fetch`
    // is not doing it implicitly.
    if (query.has_reference) {
      query.has_reference = JSON.stringify(query.has_reference);
    }
    if (query.has_no_reference) {
      query.has_no_reference = JSON.stringify(query.has_no_reference);
    }

    // `aggs` is a structured object. we need to stringify it before sending it, as `fetch`
    // is not doing it implicitly.
    if (query.aggs) {
      query.aggs = JSON.stringify(query.aggs);
    }

    const request: ReturnType<SavedObjectsApi['find']> = this.savedObjectsFetch(path, {
      method: 'GET',
      query,
    });
    return request.then((resp) => {
      return renameKeys<SavedObjectsFindResponseInternal, SavedObjectsFindResponse>(
        {
          aggregations: 'aggregations',
          saved_objects: 'savedObjects',
          total: 'total',
          per_page: 'perPage',
          page: 'page',
        },
        {
          ...resp,
          saved_objects: resp.saved_objects.map((d) => this.createSavedObject(d)),
        }
      ) as SavedObjectsFindResponse<T>;
    });
  };

  public get = <T = unknown>(type: string, id: string): Promise<SimpleSavedObject<T>> => {
    if (!type || !id) {
      return Promise.reject(new Error('requires type and id'));
    }

    return new Promise((resolve, reject) => {
      this.batchGetQueue.push({ type, id, resolve, reject } as BatchGetQueueEntry);
      this.processBatchGetQueue();
    });
  };

  public bulkGet = (objects: Array<{ id: string; type: string }> = []) => {
    const filteredObjects = objects.map((obj) => pick(obj, ['id', 'type']));
    return this.performBulkGet(filteredObjects).then((resp) => {
      resp.saved_objects = resp.saved_objects.map((d) => this.createSavedObject(d));
      return renameKeys<
        PromiseType<ReturnType<SavedObjectsApi['bulkGet']>>,
        SavedObjectsBatchResponse
      >({ saved_objects: 'savedObjects' }, resp) as SavedObjectsBatchResponse;
    });
  };

  private async performBulkGet(objects: SavedObjectTypeIdTuple[]) {
    const path = this.getPath(['_bulk_get']);
    const request: ReturnType<SavedObjectsApi['bulkGet']> = this.savedObjectsFetch(path, {
      method: 'POST',
      body: JSON.stringify(objects),
    });
    return request;
  }

  public resolve = <T = unknown>(
    type: string,
    id: string
  ): Promise<ResolvedSimpleSavedObject<T>> => {
    if (!type || !id) {
      return Promise.reject(new Error('requires type and id'));
    }

    return new Promise((resolve, reject) => {
      this.batchResolveQueue.push({ type, id, resolve, reject } as BatchResolveQueueEntry);
      this.processBatchResolveQueue();
    });
  };

  public bulkResolve = async <T = unknown>(objects: Array<{ id: string; type: string }> = []) => {
    const filteredObjects = objects.map(({ type, id }) => ({ type, id }));
    const response = await this.performBulkResolve<T>(filteredObjects);
    return {
      resolved_objects: response.resolved_objects.map((resolveResponse) =>
        this.createResolvedSavedObject<T>(resolveResponse)
      ),
    };
  };

  private async performBulkResolve<T>(objects: SavedObjectTypeIdTuple[]) {
    const path = this.getPath(['_bulk_resolve']);
    const request: Promise<SavedObjectsBulkResolveResponseServer<T>> = this.savedObjectsFetch(
      path,
      {
        method: 'POST',
        body: JSON.stringify(objects),
      }
    );
    return request;
  }

  public update<T = unknown>(
    type: string,
    id: string,
    attributes: T,
    { version, references, upsert }: SavedObjectsUpdateOptions = {}
  ): Promise<SimpleSavedObject<T>> {
    if (!type || !id || !attributes) {
      return Promise.reject(new Error('requires type, id and attributes'));
    }

    const path = this.getPath([type, id]);
    const body = {
      attributes,
      references,
      version,
      upsert,
    };

    return this.savedObjectsFetch<SavedObject<T>>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }).then((resp) => {
      return this.createSavedObject(resp);
    });
  }

  public bulkUpdate<T = unknown>(objects: SavedObjectsBulkUpdateObject[] = []) {
    const path = this.getPath(['_bulk_update']);

    return this.savedObjectsFetch<{ saved_objects: Array<SavedObject<T>> }>(path, {
      method: 'PUT',
      body: JSON.stringify(objects),
    }).then((resp) => {
      resp.saved_objects = resp.saved_objects.map((d) => this.createSavedObject(d));
      return renameKeys<
        PromiseType<ReturnType<SavedObjectsApi['bulkUpdate']>>,
        SavedObjectsBatchResponse
      >({ saved_objects: 'savedObjects' }, resp) as SavedObjectsBatchResponse<T>;
    });
  }

  private createSavedObject<T = unknown>(options: SavedObject<T>): SimpleSavedObject<T> {
    return new SimpleSavedObjectImpl(this, options);
  }

  private createResolvedSavedObject<T = unknown>(
    resolveResponse: SavedObjectsResolveResponse<T>
  ): ResolvedSimpleSavedObject<T> {
    const simpleSavedObject = new SimpleSavedObjectImpl<T>(this, resolveResponse.saved_object);
    return {
      saved_object: simpleSavedObject,
      outcome: resolveResponse.outcome,
      alias_target_id: resolveResponse.alias_target_id,
      alias_purpose: resolveResponse.alias_purpose,
    };
  }

  private getPath(path: Array<string | undefined>): string {
    return API_BASE_URL + joinUriComponents(...path);
  }

  /**
   * To ensure we don't break backwards compatibility, savedObjectsFetch keeps
   * the old kfetch error format of `{res: {status: number}}` whereas `http.fetch`
   * uses `{response: {status: number}}`.
   */
  private savedObjectsFetch<T = unknown>(path: string, { method, query, body }: HttpFetchOptions) {
    return this.http.fetch<T>(path, { method, query, body });
  }
}

/**
 * Returns a new object with the own properties of `obj`, but the
 * keys renamed according to the `keysMap`.
 *
 * @param keysMap - a map of the form `{oldKey: newKey}`
 * @param obj - the object whose own properties will be renamed
 */
const renameKeys = <T extends Record<string, any>, U extends Record<string, any>>(
  keysMap: Record<keyof T, keyof U>,
  obj: Record<string, any>
) =>
  Object.keys(obj).reduce((acc, key) => {
    return {
      ...acc,
      ...{ [keysMap[key] || key]: obj[key] },
    };
  }, {});
