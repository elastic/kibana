/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { EventBus } from './event_bus';
import type { ContentStorage, StorageContext } from './types';

export interface GetResponse<T = any> {
  contentTypeId: string;
  item: T;
}

export interface BulkGetResponse<T = any> {
  contentTypeId: string;
  items: T;
}

export interface CreateItemResponse<T = any> {
  contentTypeId: string;
  result: T;
}

export interface UpdateItemResponse<T = any> {
  contentTypeId: string;
  result: T;
}

export interface DeleteItemResponse<T = any> {
  contentTypeId: string;
  result: T;
}

export interface SearchResponse<T = any> {
  contentTypeId: string;
  result: T;
}

export class ContentCrud implements ContentStorage {
  private storage: ContentStorage;
  private eventBus: EventBus;
  public contentTypeId: string;

  constructor(
    contentTypeId: string,
    contentStorage: ContentStorage,
    {
      eventBus,
    }: {
      eventBus: EventBus;
    }
  ) {
    this.contentTypeId = contentTypeId;
    this.storage = contentStorage;
    this.eventBus = eventBus;
  }

  public async get<Options extends object = object, O = any>(
    ctx: StorageContext,
    contentId: string,
    options?: Options
  ): Promise<GetResponse<O>> {
    this.eventBus.emit({
      type: 'getItemStart',
      contentId,
      contentTypeId: this.contentTypeId,
      options,
    });

    try {
      const item = await this.storage.get(ctx, contentId, options);

      this.eventBus.emit({
        type: 'getItemSuccess',
        contentId,
        contentTypeId: this.contentTypeId,
        data: item,
        options,
      });

      return { contentTypeId: this.contentTypeId, item };
    } catch (e) {
      this.eventBus.emit({
        type: 'getItemError',
        contentId,
        contentTypeId: this.contentTypeId,
        options,
        error: e.message,
      });

      throw e;
    }
  }

  public async bulkGet<Options extends object = object, O = any>(
    ctx: StorageContext,
    ids: string[],
    options?: Options
  ): Promise<BulkGetResponse<O>> {
    this.eventBus.emit({
      type: 'bulkGetItemStart',
      contentTypeId: this.contentTypeId,
      ids,
      options,
    });

    try {
      const items = await this.storage.bulkGet(ctx, ids, options);

      this.eventBus.emit({
        type: 'bulkGetItemSuccess',
        ids,
        contentTypeId: this.contentTypeId,
        data: items,
        options,
      });

      return {
        contentTypeId: this.contentTypeId,
        items,
      };
    } catch (e) {
      this.eventBus.emit({
        type: 'bulkGetItemError',
        ids,
        contentTypeId: this.contentTypeId,
        options,
        error: e.message,
      });

      throw e;
    }
  }

  public async create<Data extends object, Options extends object = object, O = any>(
    ctx: StorageContext,
    data: Data,
    options?: Options
  ): Promise<CreateItemResponse<O>> {
    this.eventBus.emit({
      type: 'createItemStart',
      contentTypeId: this.contentTypeId,
      data,
      options,
    });

    try {
      const result = await this.storage.create(ctx, data, options);

      this.eventBus.emit({
        type: 'createItemSuccess',
        contentTypeId: this.contentTypeId,
        data: result,
        options,
      });

      return { contentTypeId: this.contentTypeId, result };
    } catch (e) {
      this.eventBus.emit({
        type: 'createItemError',
        contentTypeId: this.contentTypeId,
        data,
        options,
        error: e.message,
      });

      throw e;
    }
  }

  public async update<Data extends object, Options extends object = object, O = any>(
    ctx: StorageContext,
    id: string,
    data: Data,
    options?: Options
  ): Promise<UpdateItemResponse<O>> {
    this.eventBus.emit({
      type: 'updateItemStart',
      contentId: id,
      contentTypeId: this.contentTypeId,
      data,
      options,
    });

    try {
      const result = await this.storage.update(ctx, id, data, options);

      this.eventBus.emit({
        type: 'updateItemSuccess',
        contentId: id,
        contentTypeId: this.contentTypeId,
        data: result,
        options,
      });

      return { contentTypeId: this.contentTypeId, result };
    } catch (e) {
      this.eventBus.emit({
        type: 'updateItemError',
        contentId: id,
        contentTypeId: this.contentTypeId,
        data,
        options,
        error: e.message,
      });

      throw e;
    }
  }

  public async delete<Options extends object = object, O = any>(
    ctx: StorageContext,
    id: string,
    options?: Options
  ): Promise<DeleteItemResponse<O>> {
    this.eventBus.emit({
      type: 'deleteItemStart',
      contentId: id,
      contentTypeId: this.contentTypeId,
      options,
    });

    try {
      const result = await this.storage.delete(ctx, id, options);

      this.eventBus.emit({
        type: 'deleteItemSuccess',
        contentId: id,
        contentTypeId: this.contentTypeId,
        options,
      });

      return { contentTypeId: this.contentTypeId, result };
    } catch (e) {
      this.eventBus.emit({
        type: 'deleteItemError',
        contentId: id,
        contentTypeId: this.contentTypeId,
        options,
        error: e.message,
      });

      throw e;
    }
  }

  public async search<Query extends object, Options extends object = object, O = any>(
    ctx: StorageContext,
    query: Query,
    options?: Options
  ): Promise<SearchResponse<O>> {
    this.eventBus.emit({
      type: 'searchItemStart',
      contentTypeId: this.contentTypeId,
      query,
      options,
    });

    try {
      const result = await this.storage.search(ctx, query, options);

      this.eventBus.emit({
        type: 'searchItemSuccess',
        contentTypeId: this.contentTypeId,
        query,
        data: result,
        options,
      });

      return { contentTypeId: this.contentTypeId, result };
    } catch (e) {
      this.eventBus.emit({
        type: 'searchItemError',
        contentTypeId: this.contentTypeId,
        query,
        options,
        error: e.message,
      });

      throw e;
    }
  }
}
