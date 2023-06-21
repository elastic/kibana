/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import assert from 'assert';
import { once } from 'lodash';
import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { Semaphore } from '@kbn/std';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { promisify } from 'util';
import { lastValueFrom, defer } from 'rxjs';
import { PerformanceMetricEvent, reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { FilesPlugin } from '../../../plugin';
import { FILE_UPLOAD_PERFORMANCE_EVENT_NAME } from '../../../performance';
import type { BlobStorageClient } from '../../types';
import type { ReadableContentStream } from './content_stream';
import { getReadableContentStream, getWritableContentStream } from './content_stream';
import { mappings } from './mappings';

/**
 * Export this value for convenience to be used in tests. Do not use outside of
 * this adapter.
 * @internal
 */
export const BLOB_STORAGE_SYSTEM_INDEX_NAME = '.kibana_blob_storage';

export const MAX_BLOB_STORE_SIZE_BYTES = 50 * 1024 * 1024 * 1024; // 50 GiB

interface UploadOptions {
  transforms?: Transform[];
  id?: string;
}

export class ElasticsearchBlobStorageClient implements BlobStorageClient {
  private static defaultSemaphore: Semaphore;

  /**
   * Call this function once to globally set a concurrent upload limit for
   * all {@link ElasticsearchBlobStorageClient} instances.
   */
  public static configureConcurrentUpload(capacity: number) {
    this.defaultSemaphore = new Semaphore(capacity);
  }

  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly index: string = BLOB_STORAGE_SYSTEM_INDEX_NAME,
    private readonly chunkSize: undefined | string,
    private readonly logger: Logger,
    /**
     * Override the default concurrent upload limit by passing in a different
     * semaphore
     */
    private readonly uploadSemaphore = ElasticsearchBlobStorageClient.defaultSemaphore,
    /** Indicates that the index provided is an alias (changes how content is retrieved internally) */
    private readonly indexIsAlias: boolean = false
  ) {
    assert(this.uploadSemaphore, `No default semaphore provided and no semaphore was passed in.`);
  }

  /**
   * This function acts as a singleton i.t.o. execution: it can only be called once.
   * Subsequent calls should not re-execute it.
   *
   * There is a known issue where calling this function simultaneously can result
   * in a race condition where one of the calls will fail because the index is already
   * being created. This is only an issue for the very first time the index is being
   * created.
   */
  private static createIndexIfNotExists = once(
    async (index: string, esClient: ElasticsearchClient, logger: Logger): Promise<void> => {
      try {
        if (await esClient.indices.exists({ index })) {
          logger.debug(`${index} already exists.`);
          return;
        }

        logger.info(`Creating ${index} for Elasticsearch blob store.`);

        await esClient.indices.create({
          index,
          wait_for_active_shards: 'all',
          body: {
            settings: {
              number_of_shards: 1,
              auto_expand_replicas: '0-1',
            },
            mappings,
          },
        });
      } catch (e) {
        if (e instanceof errors.ResponseError && e.statusCode === 400) {
          logger.warn('Unable to create blob storage index, it may have been created already.');
        }
        // best effort
      }
    }
  );

  public async upload(src: Readable, options: UploadOptions = {}) {
    const { transforms, id } = options;

    await ElasticsearchBlobStorageClient.createIndexIfNotExists(
      this.index,
      this.esClient,
      this.logger
    );

    const processUpload = async () => {
      try {
        const analytics = FilesPlugin.getAnalytics();
        const dest = getWritableContentStream({
          id,
          client: this.esClient,
          index: this.index,
          logger: this.logger.get('content-stream-upload'),
          parameters: {
            maxChunkSize: this.chunkSize,
          },
        });

        const start = performance.now();
        await pipeline([src, ...(transforms ?? []), dest]);
        const end = performance.now();

        const _id = dest.getContentReferenceId()!;
        const size = dest.getBytesWritten();

        const perfArgs: PerformanceMetricEvent = {
          eventName: FILE_UPLOAD_PERFORMANCE_EVENT_NAME,
          duration: end - start,
          key1: 'size',
          value1: size,
          meta: {
            datasource: 'es',
            id: _id,
            index: this.index,
            chunkSize: this.chunkSize,
          },
        };

        if (analytics) {
          reportPerformanceMetricEvent(analytics, perfArgs);
        }

        return { id: _id, size };
      } catch (e) {
        this.logger.error(`Could not write chunks to Elasticsearch for id ${id}: ${e}`);
        throw e;
      }
    };

    return lastValueFrom(defer(processUpload).pipe(this.uploadSemaphore.acquire()));
  }

  private getReadableContentStream(id: string, size?: number): ReadableContentStream {
    return getReadableContentStream({
      id,
      client: this.esClient,
      index: this.index,
      logger: this.logger.get('content-stream-download'),
      parameters: {
        size,
      },
      indexIsAlias: this.indexIsAlias,
    });
  }

  public async download({ id, size }: { id: string; size?: number }): Promise<Readable> {
    return this.getReadableContentStream(id, size);
  }

  public async delete(id: string): Promise<void> {
    try {
      const dest = getWritableContentStream({
        id,
        client: this.esClient,
        index: this.index,
        logger: this.logger.get('content-stream-delete'),
      });
      /** @note Overwriting existing content with an empty buffer to remove all the chunks. */
      await promisify(dest.end.bind(dest, '', 'utf8'))();
    } catch (e) {
      this.logger.error(`Could not delete file: ${e}`);
      throw e;
    }
  }
}
