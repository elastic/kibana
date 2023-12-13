/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup } from '@kbn/core/server';
import { TimedItemBuffer } from '@kbn/bfetch-plugin/common';
import { TranslogService } from './translog_service';
import type {
  AddDocAction,
  DeleteDocAction,
  SearchIndexAction,
  SearchIndexDoc,
  SearchIndexLogger,
  UpdateDocAction,
} from './types';
import { retry } from './utils';
import { SearchIndexClient } from './types';
import { SearchIndexClientFactory } from './search_index_client_factory';

export interface SearchIndexInitializerContext {
  logger: SearchIndexLogger;
  clientFactory: SearchIndexClientFactory;
}

export interface SearchIndexSetup {
  core: CoreSetup;
}

export interface BufferData<A extends SearchIndexAction = SearchIndexAction> {
  time: number;
  action: A;
}

export class SearchIndex {
  protected client?: SearchIndexClient;
  readonly #translogService: TranslogService | undefined;
  readonly #buffer: TimedItemBuffer<BufferData>;

  constructor(private readonly ctx: SearchIndexInitializerContext) {
    this.#buffer = new TimedItemBuffer<BufferData>({
      flushOnMaxItems: 100,
      maxItemAge: 1000,
      onFlush: async (data: BufferData[]) => {
        if (!this.client) {
          ctx.logger.error('SearchIndexClient is not initialized, documents will not be indexed.');
          return;
        }

        const { logger } = this.ctx;

        if (!this.#translogService) {
          logger.error('SearchIndex is not initialized, documents will not be written.');
          return;
        }

        const addActions = data
          .filter((d): d is BufferData<AddDocAction> => d.action.type === 'add')
          .map(({ action }) => action); // TODO: add utils to reconcile the data
        const updateActions = data
          .filter((d): d is BufferData<UpdateDocAction> => d.action.type === 'update')
          .map(({ action }) => action);
        const deleteActions = data
          .filter((d): d is BufferData<DeleteDocAction> => d.action.type === 'delete')
          .map(({ action }) => action);

        let clientError: any;

        if (addActions.length > 0) {
          try {
            await this.client.add(addActions);
          } catch (error) {
            clientError = error;
            logger.error('Failed to add documents to Search Index...');
            logger.error(error);
          }
        }

        if (updateActions.length > 0) {
          try {
            await this.client.update(updateActions);
          } catch (error) {
            clientError = error;
            logger.error('Failed to update documents to Search Index...');
            logger.error(error);
          }
        }

        if (deleteActions.length > 0) {
          try {
            await this.client.delete(deleteActions);
          } catch (error) {
            clientError = error;
            logger.error('Failed to delete documents to Search Index...');
            logger.error(error);
          }
        }

        if (!clientError) {
          // Clear translog up to the previous second
          const previousSecond = this.currentSecond() - 1;
          this.#translogService.clearUpTo(previousSecond);
        }
      },
    });

    this.#translogService = new TranslogService();
  }

  public setup({ core }: SearchIndexSetup): void {
    this.client = this.ctx.clientFactory.create(core);
  }

  /** Called during "start" plugin life-cycle. */
  public start(): void {
    const { logger } = this.ctx;

    if (!this.client) throw new Error('EventStreamClient not initialized.');

    logger.debug('Initializing Event Stream.');
    this.client
      .initialize()
      .then(() => {
        logger.debug('Event Stream was initialized.');
      })
      .catch((error) => {
        logger.error('Failed to initialize Event Stream. Events will not be indexed.');
        logger.error(error);
      });
  }

  public async addDocument(id: string, doc: SearchIndexDoc) {
    if (!this.#translogService) {
      throw new Error('Translog Service not initialized');
    }

    console.log('[Search Index] Adding document:', JSON.stringify({ doc }));

    await retry(
      async () => this.#translogService?.store({ type: 'add', id, doc }),
      'storeTranslogData',
      this.ctx.logger
    );

    this.#buffer.write({
      action: {
        type: 'add',
        id,
        doc,
      },
      time: Date.now(),
    });
  }

  public async updateDocument(id: string, doc: Partial<SearchIndexDoc>) {
    if (!this.#translogService) {
      throw new Error('Translog Service not initialized');
    }

    console.log('[Search Index] Updating document:', JSON.stringify({ id, doc }));

    await retry(
      async () => this.#translogService?.store({ type: 'update', id, doc }),
      'storeTranslogData',
      this.ctx.logger
    );

    this.#buffer.write({
      action: {
        type: 'update',
        id,
        doc,
      },
      time: Date.now(),
    });
  }

  public async deleteDocument(id: string) {
    if (!this.#translogService) {
      throw new Error('Translog Service not initialized');
    }

    console.log('[Search Index] Deleting document:', JSON.stringify({ id }));

    await retry(
      async () => this.#translogService?.store({ type: 'delete', id }),
      'storeTranslogData',
      this.ctx.logger
    );

    this.#buffer.write({
      action: {
        type: 'delete',
        id,
      },
      time: Date.now(),
    });
  }

  public async stop(): Promise<void> {
    await this.#buffer.flushAsync();
  }

  private currentSecond() {
    return Math.floor(new Date().getTime() / 1000);
  }
}
