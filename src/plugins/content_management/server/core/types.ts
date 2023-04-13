/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { ContentManagementGetTransformsFn, Version } from '@kbn/object-versioning';

import type {
  GetResult,
  BulkGetResult,
  CreateResult,
  UpdateResult,
  DeleteResult,
  SearchQuery,
  SearchResult,
} from '../../common';

/** Context that is sent to all storage instance methods */
export interface StorageContext {
  requestHandlerContext: RequestHandlerContext;
  version: {
    request: Version;
    latest: Version;
  };
  utils: {
    getTransforms: ContentManagementGetTransformsFn;
  };
}

export interface ContentStorage<T = unknown, U = T> {
  /** Get a single item */
  get(ctx: StorageContext, id: string, options?: object): Promise<GetResult<T, any>>;

  /** Get multiple items */
  bulkGet(ctx: StorageContext, ids: string[], options?: object): Promise<BulkGetResult<T, any>>;

  /** Create an item */
  create(ctx: StorageContext, data: object, options?: object): Promise<CreateResult<T, any>>;

  /** Update an item */
  update(
    ctx: StorageContext,
    id: string,
    data: object,
    options?: object
  ): Promise<UpdateResult<U, any>>;

  /** Delete an item */
  delete(ctx: StorageContext, id: string, options?: object): Promise<DeleteResult>;

  /** Search items */
  search(ctx: StorageContext, query: SearchQuery, options?: object): Promise<SearchResult<T>>;
}

export interface ContentTypeDefinition<S extends ContentStorage = ContentStorage> {
  /** Unique id for the content type */
  id: string;
  /** The storage layer for the content. It must implment the ContentStorage interface. */
  storage: S;
  version: {
    latest: Version;
  };
}
