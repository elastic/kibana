/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CommonFields, InternalFields, KibanaContent } from '../../common';

export interface ContentStorage<
  UniqueFields extends object = Record<string, unknown>,
  UserFields extends CommonFields = UniqueFields & CommonFields,
  Content extends KibanaContent = InternalFields & UserFields
> {
  /** Get a single item */
  get(id: string, options?: unknown): Promise<Content>;

  /** Get multiple items */
  mget(ids: string[], options?: unknown): Promise<Content[]>;

  /** Create an item */
  create(fields: UserFields, options?: unknown): Promise<Content>;

  // /** Update an item */
  update<T extends Partial<UserFields>>(
    id: string,
    fields: T,
    options?: unknown
  ): Promise<Partial<T & InternalFields>>;

  /** Delete an item */
  delete(id: string, options?: unknown): Promise<Content>;

  search<O extends SearchOptions = SearchOptions>(options: O): Promise<KibanaContent>;
}

// --- CONFIG

export interface ContentConfig<S extends ContentStorage> {
  /** The storage layer for the content.*/
  storage: S;
  /** Optional handler to convert the DB item to a KibanaContent */
  dbToKibanaContentSerializer?: (item: any) => KibanaContent;
}

export interface SearchOptions {
  limit?: number;
  pageCursor?: string;
}
