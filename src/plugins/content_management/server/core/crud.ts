/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  GetResult,
  BulkGetResult,
  CreateResult,
  UpdateResult,
  DeleteResult,
  SearchResult,
  SearchQuery,
} from '../../common';
import type { EventBus } from './event_bus';
import type { ContentStorage, StorageContext } from './types';

export interface GetResponse<T = unknown, M = void> {
  contentTypeId: string;
  result: GetResult<T, M>;
}

export interface BulkGetResponse<T = unknown, M = void> {
  contentTypeId: string;
  result: BulkGetResult<T, M>;
}

export interface CreateItemResponse<T = unknown, M = void> {
  contentTypeId: string;
  result: CreateResult<T, M>;
}

export interface UpdateItemResponse<T = unknown, M = void> {
  contentTypeId: string;
  result: UpdateResult<T, M>;
}

export interface DeleteItemResponse {
  contentTypeId: string;
  result: DeleteResult;
}

export interface SearchResponse<T = unknown> {
  contentTypeId: string;
  result: SearchResult<T>;
}

export class ContentCrud<T = unknown> {
  private storage: ContentStorage<T>;
  private eventBus: EventBus;
  public contentTypeId: string;

  constructor(
    contentTypeId: string,
    contentStorage: ContentStorage<T>,
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

  public async get(
    ctx: StorageContext,
    contentId: string,
    options?: object
  ): Promise<GetResponse<T, any>> {
    this.eventBus.emit({
      type: 'getItemStart',
      contentId,
      contentTypeId: this.contentTypeId,
      options,
    });

    try {
      const result = await this.storage.get(ctx, contentId, options);

      this.eventBus.emit({
        type: 'getItemSuccess',
        contentId,
        contentTypeId: this.contentTypeId,
        data: result,
        options,
      });

      return { contentTypeId: this.contentTypeId, result };
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

  public async bulkGet(
    ctx: StorageContext,
    ids: string[],
    options?: object
  ): Promise<BulkGetResponse<T, any>> {
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
        result: items,
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

  public async create(
    ctx: StorageContext,
    data: object,
    options?: object
  ): Promise<CreateItemResponse<T, any>> {
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

  public async update(
    ctx: StorageContext,
    id: string,
    data: object,
    options?: object
  ): Promise<UpdateItemResponse<T, any>> {
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

  public async delete(
    ctx: StorageContext,
    id: string,
    options?: object
  ): Promise<DeleteItemResponse> {
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

  public async search(
    ctx: StorageContext,
    query: SearchQuery,
    options?: object
  ): Promise<SearchResponse<T>> {
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
