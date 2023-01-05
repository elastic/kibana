/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CommonFields, InternalFields, KibanaContent, SearchOptions } from './types';

export abstract class ContentStorage<
  Fields extends CommonFields = CommonFields,
  Content extends KibanaContent = KibanaContent
> {
  /** Get a single item */
  public abstract get(id: string, options?: unknown): Promise<Content>;

  /** Get multiple items */
  public abstract mget(ids: string[], options?: unknown): Promise<Content[]>;

  /** Create an item */
  public abstract create(fields: Fields, options?: unknown): Promise<Content[]>;

  /** Update an item */
  public abstract update<T extends Partial<Fields>>(
    id: string,
    fields: T,
    options?: unknown
  ): Partial<T & InternalFields>;

  /** Delete an item */
  public abstract delete(id: string, options?: unknown): Promise<Content>;

  public abstract search<O extends SearchOptions = SearchOptions>(
    options: O
  ): Promise<KibanaContent>;
}
