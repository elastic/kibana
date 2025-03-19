/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StorageContext } from '../core';
import { ContentCrud } from '../core/crud';
import type { IContentClient } from './types';

interface Context<T = unknown> {
  crudInstance: ContentCrud<T>;
  storageContext: StorageContext;
}

const secretToken = Symbol('secretToken');

export class ContentClient<T = unknown> implements IContentClient<T> {
  static create<T = unknown>(contentTypeId: string, ctx: Context<T>): IContentClient<T> {
    return new ContentClient<T>(secretToken, contentTypeId, ctx);
  }

  constructor(token: symbol, public contentTypeId: string, private readonly ctx: Context<T>) {
    if (token !== secretToken) {
      throw new Error('Use ContentClient.create() instead');
    }

    if (ctx.crudInstance instanceof ContentCrud === false) {
      throw new Error('Crud instance missing or not an instance of ContentCrud');
    }
  }

  get(id: string, options: object) {
    return this.ctx.crudInstance.get(this.ctx.storageContext, id, options);
  }

  bulkGet(ids: string[], options: object) {
    return this.ctx.crudInstance.bulkGet(this.ctx.storageContext, ids, options);
  }

  create(data: object, options?: object) {
    return this.ctx.crudInstance.create(this.ctx.storageContext, data, options);
  }

  update(id: string, data: object, options?: object) {
    return this.ctx.crudInstance.update(this.ctx.storageContext, id, data, options);
  }

  delete(id: string, options?: object) {
    return this.ctx.crudInstance.delete(this.ctx.storageContext, id, options);
  }

  search(query: object, options?: object) {
    return this.ctx.crudInstance.search(this.ctx.storageContext, query, options);
  }
}
