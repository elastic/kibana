/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Type } from '@kbn/config-schema';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';

/** Context that is sent to all storage instance methods */
export interface StorageContext {
  requestHandlerContext: RequestHandlerContext;
}

export interface ContentStorage {
  /** Get a single item */
  get(ctx: StorageContext, id: string, options: unknown): Promise<any>;

  /** Get multiple items */
  bulkGet(ctx: StorageContext, ids: string[], options: unknown): Promise<any>;

  /** Create an item */
  create(ctx: StorageContext, data: object, options: unknown): Promise<any>;

  /** Update an item */
  update(ctx: StorageContext, id: string, data: object, options: unknown): Promise<any>;

  /** Delete an item */
  delete(ctx: StorageContext, id: string, options: unknown): Promise<any>;

  /** Search items */
  search(ctx: StorageContext, query: object, options: unknown): Promise<any>;
}

export interface RpcSchemas {
  get?: {
    in?: {
      options?: Type<any>;
    };
    out?: {
      result: Type<any>;
    };
  };
  create: {
    in: {
      data: Type<any>;
      options?: Type<any>;
    };
    out?: {
      result: Type<any>;
    };
  };
  update: {
    in: {
      data: Type<any>;
      options?: Type<any>;
    };
    out?: {
      result: Type<any>;
    };
  };
  delete?: {
    in?: {
      options?: Type<any>;
    };
    out?: {
      result: Type<any>;
    };
  };
  search: {
    in: {
      query: Type<any>;
      options?: Type<any>;
    };
    out?: {
      result: Type<any>;
    };
  };
}

export type ContentSchemas = RpcSchemas;

export interface ContentTypeDefinition<S extends ContentStorage = ContentStorage> {
  /** Unique id for the content type */
  id: string;
  /** The storage layer for the content. It must implment the ContentStorage interface. */
  storage: S;
  schemas: {
    content: ContentSchemas;
  };
}
