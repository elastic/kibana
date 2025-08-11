/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Logger } from '@kbn/logging';
import { v4 as uuid } from 'uuid';
import prettyMilliseconds from 'pretty-ms';
import { duration } from 'moment';
import { ElasticsearchClient } from '@kbn/core/server';
import pRetry from 'p-retry';
import { LOCKS_CONCRETE_INDEX_NAME } from './setup_lock_manager_index';
import { runSetupIndexAssetOnce } from './utils/setup_index_assets_once';
import {
  LockAcquisitionError,
  getEsReason,
  getRetryConfig,
  isDocumentMissingException,
  isRetryableError,
  isVersionConflictException,
} from './utils/error_handling';

export type LockId = string;
export interface LockDocument {
  createdAt: string;
  expiresAt: string;
  metadata: Record<string, any>;
  token: string;
}

export interface AcquireOptions {
  /**
   * Metadata to be stored with the lock. This can be any key-value pair.
   * This is not mapped and therefore not searchable.
   */
  metadata?: Record<string, any>;
  /**
   * Time to live (TTL) for the lock in milliseconds. Default is 30 seconds.
   * When a lock expires it can be acquired by another process
   */
  ttl?: number;
}
export class LockManager {
  private token = uuid();

  constructor(
    private lockId: LockId,
    private esClient: ElasticsearchClient,
    private logger: Logger
  ) {}

  /**
   * Attempts to acquire a lock by creating a document with the given lockId.
   * If the lock exists and is expired, it will be released and acquisition retried.
   */
  public async acquire({
    metadata = {},
    ttl = duration(30, 'seconds').asMilliseconds(),
  }: AcquireOptions = {}): Promise<boolean> {
    await runSetupIndexAssetOnce(this.esClient, this.logger);
    this.token = uuid();

    return pRetry(async () => {
      try {
        const response = await this.esClient.update<LockDocument>({
          index: LOCKS_CONCRETE_INDEX_NAME,
          id: this.lockId,
          scripted_upsert: true,
          script: {
            lang: 'painless',
            source: `
                    // Get the current time on the ES server.
                    long now = System.currentTimeMillis();

                    // Update the document if:
                    // - the document does not exist or,
                    // - the lock is expired or,
                    // - the current document is owned by the same token
                    if (ctx.op == 'create' ||
                        Instant.parse(ctx._source.expiresAt).toEpochMilli() < now ||
                        ctx._source.token == params.token) {
                      def instantNow = Instant.ofEpochMilli(now);
                      ctx._source.createdAt = instantNow.toString();
                      ctx._source.expiresAt = instantNow.plusMillis(params.ttl).toString();
                      ctx._source.metadata = params.metadata;
                      ctx._source.token = params.token;
                    } else {
                      ctx.op = 'noop';
                    }
                  `,
            params: {
              ttl,
              token: this.token,
              metadata,
            },
          },
          // @ts-expect-error
          upsert: {},
        });

        switch (response.result) {
          case 'created': {
            this.logger.debug(
              `Lock "${this.lockId}" with token = ${
                this.token
              } acquired with ttl = ${prettyMilliseconds(ttl)}`
            );
            return true;
          }
          case 'updated': {
            this.logger.debug(
              `Lock "${this.lockId}" was expired and re-acquired with ttl = ${prettyMilliseconds(
                ttl
              )} and token = ${this.token}`
            );
            return true;
          }
          case 'noop': {
            this.logger.debug(
              `Lock "${this.lockId}" with token = ${this.token} could not be acquired. It is already held`
            );
            return false;
          }
          default:
            this.logger.warn(`Unexpected response: ${response.result}`);
            return false;
        }
      } catch (error: any) {
        // Do not retry on version conflict
        if (isVersionConflictException(error)) {
          this.logger.debug(`Lock "${this.lockId}" already held (version conflict)`);
          return false;
        }

        const esReason = getEsReason(error);

        // Retry certain errors
        if (isRetryableError(error)) {
          this.logger.debug(
            `Retrying lock acquisition for "${this.lockId}": ${error.message} and reason: ${esReason}`
          );
          throw error; // re-throw error to retry
        }

        // Do not retry on any other error
        this.logger.error(
          `Failed to acquire lock "${this.lockId}": ${error.message} and reason: ${esReason}`
        );
        throw new pRetry.AbortError(error);
      }
    }, getRetryConfig({ logger: this.logger, retryName: `acquire("${this.lockId}")` }));
  }

  /**
   * Releases the lock by deleting the document with the given lockId and token
   */
  public async release(): Promise<boolean> {
    return pRetry(async () => {
      try {
        const response = await this.esClient.update<LockDocument>({
          index: LOCKS_CONCRETE_INDEX_NAME,
          id: this.lockId,
          scripted_upsert: false,
          script: {
            lang: 'painless',
            source: `
                    if (ctx._source.token == params.token) {
                      ctx.op = 'delete';
                    } else {
                      ctx.op = 'noop';
                    }
                  `,
            params: { token: this.token },
          },
        });

        switch (response.result) {
          case 'deleted':
            this.logger.debug(`Lock "${this.lockId}" released with token ${this.token}.`);
            return true;
          case 'noop':
            this.logger.warn(
              `Lock "${this.lockId}" with token = ${this.token} could not be released. Token does not match.`
            );
            return false;
          default:
            this.logger.warn(`Unexpected response: ${response.result}`);
            return false;
        }
      } catch (error: any) {
        // Do not retry if the lock is already released
        if (isDocumentMissingException(error)) {
          this.logger.debug(`Lock "${this.lockId}" already released.`);
          return false;
        }

        const esReason = getEsReason(error);

        if (isRetryableError(error)) {
          this.logger.debug(
            `Retrying lock release for "${this.lockId}": ${error.message} and reason: ${esReason}`
          );
          throw error; // re-throw error to retry
        }

        // do not retry on any other error. Re-throw error
        this.logger.error(
          `Failed to release lock "${this.lockId}": ${error.message} and reason: ${esReason}`
        );
        throw new pRetry.AbortError(error);
      }
    }, getRetryConfig({ logger: this.logger, retryName: `release("${this.lockId}")` }));
  }

  /**
   * Retrieves the lock document for a given lockId.
   * If the lock is expired, it will not be returned.
   */
  public async get(): Promise<LockDocument | undefined> {
    const result = await this.esClient.get<LockDocument>(
      { index: LOCKS_CONCRETE_INDEX_NAME, id: this.lockId },
      { ignore: [404] }
    );

    if (!result._source) {
      return undefined;
    }

    const isExpired = new Date(result._source?.expiresAt).getTime() < Date.now();
    if (isExpired) {
      return undefined;
    }

    return result._source;
  }

  /**
   * Extends the TTL of the current lock (if the token matches).
   */
  public async extendTtl(ttl: number): Promise<boolean> {
    return pRetry(async () => {
      try {
        const response = await this.esClient.update<LockDocument>({
          index: LOCKS_CONCRETE_INDEX_NAME,
          id: this.lockId,
          script: {
            lang: 'painless',
            source: `
                    if (ctx._source.token == params.token) {
                      long now = System.currentTimeMillis();
                      ctx._source.expiresAt = Instant.ofEpochMilli(now + params.ttl).toString();
                    } else {
                      ctx.op = 'noop';
                    }
                  `,
            params: {
              ttl,
              token: this.token,
            },
          },
        });

        if (response.result === 'noop') {
          this.logger.debug(`Lock "${this.lockId}" TTL not extended: token mismatch or no-op.`);
          return false;
        }

        this.logger.debug(`Lock "${this.lockId}" extended ttl with ${prettyMilliseconds(ttl)}.`);
        return true;
      } catch (error: any) {
        if (isVersionConflictException(error) || isDocumentMissingException(error)) {
          this.logger.debug(`Lock "${this.lockId}" was released concurrently. Not extending TTL.`);
          return false;
        }

        const esReason = getEsReason(error);

        if (isRetryableError(error)) {
          this.logger.debug(
            `Retrying lock extension for "${this.lockId}": ${error.message} and reason: ${esReason}`
          );
          throw error; // re-throw error to retry
        }

        // do not retry on any other error
        this.logger.error(
          `Failed to extend lock "${this.lockId}": ${error.message} and reason: ${esReason}`
        );
        this.logger.debug(error);
        throw new pRetry.AbortError(error);
      }
    }, getRetryConfig({ logger: this.logger, retryName: `extendTtl("${this.lockId}")`, maxTimeout: 2000 }));
  }
}

export async function getLock({
  esClient,
  logger,
  lockId,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  lockId: LockId;
}): Promise<LockDocument | undefined> {
  const lockManager = new LockManager(lockId, esClient, logger);
  return lockManager.get();
}

export async function withLock<T>(
  {
    esClient,
    logger,
    lockId,
    metadata,
    ttl = duration(30, 'seconds').asMilliseconds(),
  }: {
    esClient: ElasticsearchClient;
    logger: Logger;
    lockId: LockId;
  } & AcquireOptions,
  callback: () => Promise<T>
): Promise<T> {
  const lockManager = new LockManager(lockId, esClient, logger);
  const acquired = await lockManager.acquire({ metadata, ttl });

  if (!acquired) {
    logger.debug(`Lock "${lockId}" not acquired. Exiting.`);
    throw new LockAcquisitionError(`Lock "${lockId}" not acquired`);
  }

  // extend the ttl periodically
  const extendInterval = Math.floor(ttl / 4);
  logger.debug(`Extending TTL for lock "${lockId}" every ${prettyMilliseconds(extendInterval)}`);

  let extendTtlPromise = Promise.resolve(true);
  const intervalId = setInterval(() => {
    // wait for the previous extendTtl request to finish before sending the next one. This is to avoid flooding ES with extendTtl requests in cases where ES is slow to respond.
    extendTtlPromise = extendTtlPromise
      .then(() => lockManager.extendTtl(ttl))
      .catch((err) => {
        logger.error(`Failed to extend lock "${lockId}":`, err);
        return false;
      });
  }, extendInterval);

  try {
    return await callback();
  } finally {
    try {
      clearInterval(intervalId);
      await extendTtlPromise;
      await lockManager.release();
    } catch (error: any) {
      logger.error(`Failed to release lock "${lockId}" in withLock: ${error.message}`);
      logger.debug(error);
    }
  }
}
