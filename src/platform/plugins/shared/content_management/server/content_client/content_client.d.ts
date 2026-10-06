/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StorageContext } from '../core';
import type { ContentCrud } from '../core/crud';
import type { IContentClient } from './types';
interface Context<T = unknown> {
  crudInstance: ContentCrud<T>;
  storageContext: StorageContext;
}
export declare class ContentClient<T = unknown> implements IContentClient<T> {
  contentTypeId: string;
  private readonly ctx;
  static create<T = unknown>(contentTypeId: string, ctx: Context<T>): IContentClient<T>;
  constructor(token: symbol, contentTypeId: string, ctx: Context<T>);
  get(id: string, options: object): Promise<import('../core/crud').GetResponse<T, any>>;
  bulkGet(ids: string[], options: object): Promise<import('../core/crud').BulkGetResponse<T, any>>;
  create(
    data: object,
    options?: object
  ): Promise<import('../core/crud').CreateItemResponse<T, any>>;
  update(
    id: string,
    data: object,
    options?: object
  ): Promise<import('../core/crud').UpdateItemResponse<T, any>>;
  delete(id: string, options?: object): Promise<import('../core/crud').DeleteItemResponse>;
  search(query: object, options?: object): Promise<import('../core/crud').SearchResponse<T>>;
}
export {};
