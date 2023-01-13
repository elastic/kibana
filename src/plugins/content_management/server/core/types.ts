/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Content } from '../../common';

export interface ContentStorage {
  /** Get a single item */
  get(id: string, options: unknown): Promise<object>;

  /** Get multiple items */
  // TODO
  // mget(ids: string[], options: unknown): Promise<object[]>;

  /** Create an item */
  create(fields: object, options: unknown): Promise<object>;

  /** Update an item */
  // TODO
  // update(id: string, fields: object, options: unknown): Promise<object>;

  /** Delete an item */
  // TODO
  // delete(id: string, options: unknown): Promise<{ status: 'success' | 'error' }>;
}

// --- CONFIG

export interface ContentConfig<
  S extends ContentStorage,
  T extends object = Record<string, unknown>
> {
  /** The storage layer for the content.*/
  storage: S;
  /** Optional handler to convert the DB item to a KibanaContent */
  toKibanaContentSerializer?: (item: T) => Content;
}
