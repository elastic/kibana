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

type CacheKind = 'input' | 'output' | 'error';

export class StepMetadataCache {
  private readonly cache = new LRUCache<string, { value: unknown }>({
    max: 1000,
    ttl: 1000 * 5, // 10 seconds
  });

  constructor(private readonly stepExecutionRepository: StepExecutionRepository) {}

  public cacheMetadata(stepExecutionId: string, cacheEntry: CacheEntry) {
    this.cache.set(stepExecutionId, cacheEntry);
  }

  public addToCache(stepExecutionId: string, kind: 'input' | 'output' | 'error', value: unknown) {
    this.cache.set(`${stepExecutionId}-${kind}`, { value });
  }

  public async getMetadataForStepExecution(
    stepExecutionIds: string[]
  ): Promise<Record<string, CacheEntry>> {
    const metadata: Record<string, CacheEntry> = {};
    const toFetch: string[] = [];
    const toFetchNEW: Record<string, CacheKind[]> = {};

    for (const stepExecutionId of stepExecutionIds) {
      if (!this.cache.has(`${stepExecutionId}-input`)) {
        toFetchNEW[stepExecutionId] = [...(toFetchNEW[stepExecutionId] || []), 'input'];
      }

      if (!this.cache.has(`${stepExecutionId}-output`)) {
        toFetchNEW[stepExecutionId] = [...(toFetchNEW[stepExecutionId] || []), 'output'];
      }

      if (!this.cache.has(`${stepExecutionId}-error`)) {
        toFetchNEW[stepExecutionId] = [...(toFetchNEW[stepExecutionId] || []), 'error'];
      }
    }

    if (Object.keys(toFetchNEW).length > 0) {
      const mapped: Record<string, { kinds: CacheKind[]; ids: string[] }> = {};

      for (const [stepExecutionId, kinds] of Object.entries(toFetchNEW)) {
        const kindsSorted = kinds.toSorted();
        const kindsGroupKey = kindsSorted.join('-');

        mapped[kindsGroupKey] = {
          kinds: kindsSorted,
          ids: [...(mapped[kindsGroupKey]?.ids || []), stepExecutionId],
        };
      }

      const all = await Promise.all(
        Object.values(mapped).map((x) =>
          this.stepExecutionRepository.getStepExecutionsByIds(x.ids, ['id', ...x.kinds] as any)
        )
      );

      all.flat().forEach((step) => {
        if (!step.id) {
          return;
        }

        this.cache.set(`${step.id}-input`, { value: step.input });
        this.cache.set(`${step.id}-output`, { value: step.output });
        this.cache.set(`${step.id}-error`, { value: step.error });
      });
    }

    return metadata;
  }
}
