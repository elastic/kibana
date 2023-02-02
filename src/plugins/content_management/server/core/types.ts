/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Type } from '@kbn/config-schema';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';

export interface StorageContext {
  requestHandlerContext?: RequestHandlerContext;
}

export interface ContentStorage {
  /** Get a single item */
  get(ctx: StorageContext, id: string, options: unknown): Promise<any>;

  /** Get multiple items */
  // TODO
  // mget(ids: string[], options: unknown): Promise<object[]>;

  /** Create an item */
  create(ctx: StorageContext, fields: object, options: unknown): Promise<any>;

  /** Update an item */
  // TODO
  // update(id: string, fields: object, options: unknown): Promise<object>;

  /** Delete an item */
  // TODO
  // delete(id: string, options: unknown): Promise<{ status: 'success' | 'error' }>;
}

export interface ContentConfig<S extends ContentStorage = ContentStorage> {
  /** The storage layer for the content.*/
  storage: S;
  schemas: {
    content: {
      // TODO
      // list: {
      //   in: {
      //     options?: Type<any>;
      //   };
      //   out: {
      //     result: Type<any>;
      //   };
      // };
      get: {
        in?: {
          options?: Type<any>;
        };
        out: {
          result: Type<any>;
        };
      };
      create: {
        in: {
          data: Type<any>;
          options?: Type<any>;
        };
        out: {
          result: Type<any>;
        };
      };
      // TODO
      // update: {
      //   in: {
      //     data: Type<any>;
      //     options?: Type<any>;
      //   };
      //   out: {
      //     result: Type<any>;
      //   };
      // };
    };
  };
}

export type ContentSchemas = ContentConfig['schemas']['content'];
