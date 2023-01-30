/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Type } from '@kbn/config-schema';
import type { Content, schemas } from '../../common';

export interface ContentStorage<T extends { id: string } = { id: string } & object> {
  /** Get a single item */
  get(id: string, options: unknown): Promise<T>;

  /** Get multiple items */
  // TODO
  // mget(ids: string[], options: unknown): Promise<object[]>;

  /** Create an item */
  create(fields: object, options: unknown): Promise<T>;

  /** Update an item */
  // TODO
  // update(id: string, fields: object, options: unknown): Promise<object>;

  /** Delete an item */
  // TODO
  // delete(id: string, options: unknown): Promise<{ status: 'success' | 'error' }>;
}

// --- CONFIG

export type SearchContentSerializer<T extends object = object> = (item: T) => Content;

type CallsWithOutSchema = keyof Pick<typeof schemas['api'], 'get'>;
type CallsWithInOutSchema = keyof Pick<typeof schemas['api'], 'create'>;

type RpcSchemas = { [key in CallsWithOutSchema]: { out: Type<any> } } & {
  [key in CallsWithInOutSchema]: { in: Type<any>; out: Type<any> };
};

export interface ContentConfig<S extends ContentStorage> {
  /** The storage layer for the content.*/
  storage: S;
  /** Optional handler to convert the DB item to a KibanaContent */
  toSearchContentSerializer?: SearchContentSerializer<any>;
  schemas: {
    rpc: RpcSchemas;
  };
}
