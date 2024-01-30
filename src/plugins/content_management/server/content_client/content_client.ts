/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ContentCrud, StorageContext } from '../core';

type CrudGetParameters = Parameters<ContentCrud['get']>;
type ClientGetParameters = [CrudGetParameters[1], CrudGetParameters[2]?];

export interface IContentClient {
  contentTypeId: string;
  get(...params: ClientGetParameters): ReturnType<ContentCrud['get']>;
}

interface Context {
  crudInstance: ContentCrud;
  storageContext: StorageContext;
}

const secretToken = Symbol('secretToken');

export class ContentClient implements IContentClient {
  static create(contentTypeId: string, ctx: Context): IContentClient {
    return new ContentClient(secretToken, contentTypeId, ctx);
  }

  constructor(token: symbol, public contentTypeId: string, private readonly ctx: Context) {
    if (token !== secretToken) {
      throw new Error('Use ContentClient.create() instead');
    }
  }

  get(id: string, options: object) {
    return this.ctx.crudInstance.get(this.ctx.storageContext, id, options);
  }
}
