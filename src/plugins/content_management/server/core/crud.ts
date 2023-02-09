/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { EventBus } from './event_bus';
import type { ContentStorage, StorageContext } from './types';

export class ContentCrud implements ContentStorage {
  private storage: ContentStorage;
  private eventBus: EventBus;
  public contentType: string;

  constructor(
    contentType: string,
    contentStorage: ContentStorage,
    {
      eventBus,
    }: {
      eventBus: EventBus;
    }
  ) {
    this.contentType = contentType;
    this.storage = contentStorage;
    this.eventBus = eventBus;
  }

  public async get<Options extends object = object, O = any>(
    ctx: StorageContext,
    contentId: string,
    options?: Options
  ): Promise<O> {
    this.eventBus.emit({
      type: 'getItemStart',
      contentId,
      contentType: this.contentType,
      options,
    });

    try {
      const result = await this.storage.get(ctx, contentId, options);

      this.eventBus.emit({
        type: 'getItemSuccess',
        contentId,
        contentType: this.contentType,
        data: result,
      });

      return result;
    } catch (e) {
      this.eventBus.emit({
        type: 'getItemError',
        contentId,
        contentType: this.contentType,
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
  ): Promise<O> {
    this.eventBus.emit({
      type: 'bulkGetItemStart',
      contentType: this.contentType,
      ids,
      options,
    });

    try {
      const result = await this.storage.bulkGet(ctx, ids, options);

      this.eventBus.emit({
        type: 'bulkGetItemSuccess',
        ids,
        contentType: this.contentType,
        data: result,
      });

      return result;
    } catch (e) {
      this.eventBus.emit({
        type: 'bulkGetItemError',
        ids,
        contentType: this.contentType,
        options,
        error: e,
      });

      throw e;
    }
  }

  public async create<Data extends object, Options extends object = object, O = any>(
    ctx: StorageContext,
    data: Data,
    options?: Options
  ): Promise<O> {
    this.eventBus.emit({
      type: 'createItemStart',
      contentType: this.contentType,
      data,
      options,
    });

    try {
      const result = await this.storage.create(ctx, data, options);

      this.eventBus.emit({
        type: 'createItemSuccess',
        contentType: this.contentType,
        data: result,
        options,
      });

      return result;
    } catch (e) {
      this.eventBus.emit({
        type: 'createItemError',
        contentType: this.contentType,
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
  ): Promise<O> {
    this.eventBus.emit({
      type: 'updateItemStart',
      contentId: id,
      contentType: this.contentType,
      data,
      options,
    });

    try {
      const result = await this.storage.update(ctx, id, data, options);

      this.eventBus.emit({
        type: 'updateItemSuccess',
        contentId: id,
        contentType: this.contentType,
        data: result,
        options,
      });

      return result;
    } catch (e) {
      this.eventBus.emit({
        type: 'updateItemError',
        contentId: id,
        contentType: this.contentType,
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
  ): Promise<O> {
    this.eventBus.emit({
      type: 'deleteItemStart',
      contentId: id,
      contentType: this.contentType,
      options,
    });

    try {
      const res = await this.storage.delete(ctx, id, options);

      this.eventBus.emit({
        type: 'deleteItemSuccess',
        contentId: id,
        contentType: this.contentType,
        options,
      });

      return res;
    } catch (e) {
      this.eventBus.emit({
        type: 'deleteItemError',
        contentId: id,
        contentType: this.contentType,
        options,
        error: e.message,
      });

      throw e;
    }
  }
}
