/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { LRUCache } from 'lru-cache';

import type { SerializedError } from '@kbn/workflows/spec/schema';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';

interface CacheEntry {
  input: unknown;
  error: SerializedError | undefined;
  output: unknown;
}

export class StepMetadataCache {
  private readonly cache = new LRUCache<string, CacheEntry>({
    max: 1000,
    ttl: 1000 * 10, // 10 seconds
  });

  constructor(private readonly stepExecutionRepository: StepExecutionRepository) {}

  public cacheMetadata(stepExecutionId: string, cacheEntry: CacheEntry) {
    this.cache.set(stepExecutionId, cacheEntry);
  }

  public async getMetadataForStepExecution(
    stepExecutionIds: string[]
  ): Promise<Record<string, CacheEntry>> {
    const metadata: Record<string, CacheEntry> = {};
    const toFetch: string[] = [];

    for (const stepExecutionId of stepExecutionIds) {
      if (!this.cache.has(stepExecutionId)) {
        toFetch.push(stepExecutionId);
      } else {
        const cacheEntry = this.cache.get(stepExecutionId) as CacheEntry;
        metadata[stepExecutionId] = cacheEntry ?? {
          input: undefined,
          output: undefined,
          error: undefined,
        };
      }
    }

    if (toFetch.length > 0) {
      const stepExecutions = await this.stepExecutionRepository.getStepExecutionsByIds(toFetch);
      for (const stepExecution of stepExecutions) {
        const cacheEntry: CacheEntry = {
          input: stepExecution.input,
          output: stepExecution.output,
          error: stepExecution.error,
        };
        this.cache.set(stepExecution.id, cacheEntry);
        metadata[stepExecution.id] = cacheEntry;
      }
    }

    return metadata;
  }
}
