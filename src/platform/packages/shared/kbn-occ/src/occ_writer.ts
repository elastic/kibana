/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_MAX_RETRIES, DEFAULT_RETRY_DELAY_MS } from './constants';
import { OccConflictError, isOccConflictError } from './errors';
import type { OccWriteParams, OccWriteResult, OccWriterDeps } from './types';

const delay = async (ms: number): Promise<void> => {
  if (ms <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export class OccWriter<TSource extends object> {
  private readonly get: OccWriterDeps<TSource>['get'];
  private readonly index: OccWriterDeps<TSource>['index'];
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly logger?: OccWriterDeps<TSource>['logger'];

  constructor(deps: OccWriterDeps<TSource>) {
    this.get = deps.get;
    this.index = deps.index;
    this.maxRetries = deps.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelayMs = deps.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.logger = deps.logger;
  }

  async write(params: OccWriteParams<TSource>): Promise<OccWriteResult<TSource>> {
    const { id, create, mutate } = params;

    if (create) {
      const document = mutate(undefined);
      const occ = await this.index({ id, document, create: true });
      return { document, occ };
    }

    const maxAttempts = 1 + this.maxRetries;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error(`Document with id "${id}" not found`);
      }

      const document = mutate(existing.source);

      try {
        const occ = await this.index({
          id,
          document,
          ifSeqNo: existing.occ.seqNo,
          ifPrimaryTerm: existing.occ.primaryTerm,
        });
        return { document, occ };
      } catch (error) {
        if (!isOccConflictError(error) || attempt >= maxAttempts) {
          if (isOccConflictError(error) && attempt >= maxAttempts) {
            throw new OccConflictError(
              `Version conflict for document "${id}" after ${attempt} attempts`
            );
          }
          throw error;
        }

        this.logger?.debug(
          `OCC write conflict for document "${id}", retrying (attempt ${attempt}/${maxAttempts})`
        );
        await delay(this.retryDelayMs);
      }
    }

    throw new OccConflictError(`Version conflict for document "${id}"`);
  }
}
