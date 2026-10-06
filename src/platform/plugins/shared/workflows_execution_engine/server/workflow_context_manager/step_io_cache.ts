/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LRUCache } from 'lru-cache';
import type { Logger } from '@kbn/core/server';
import type { JsonValue } from '@kbn/utility-types';
import { safeOutputSize } from '../step/errors';

export type StepIoType = 'input' | 'output';

// LRUCache<V> constrains V extends {}, which excludes null.
// Box the value so null outputs are stored without violating the constraint.
// get() returns undefined (cache miss) vs null (cached null output) correctly.
interface CacheEntry {
  value: JsonValue | null;
}

/**
 * Byte-bounded LRU cache for step IO.
 *
 * Owns the key scheme (`${type}_${stepExecutionId}`) so raw key strings never
 * appear outside this class. Callers work with `(id, type)` pairs.
 *
 * Currently only outputs are cached (inputs go to state only). Caching inputs
 * later requires no API change — just remove the guard in `StepIoService.write`.
 */
export class StepIoCache {
  private readonly lru: LRUCache<string, CacheEntry>;

  /**
   * @param maxBytes Byte budget. `Infinity` means no eviction. `0` (or less) keeps
   * nothing resident: lru-cache treats a `maxSize` of 0 as unbounded and rejects
   * non-finite values, so both are mapped to valid sizes here.
   */
  constructor(maxBytes: number, logger?: Logger) {
    const cacheLogger = logger?.get('step_io_cache');
    let maxSize = 1;
    if (maxBytes > 0) {
      maxSize = Number.isFinite(maxBytes) ? Math.floor(maxBytes) || 1 : Number.MAX_SAFE_INTEGER;
    }
    this.lru = new LRUCache({
      maxSize,
      // Fallback size used when the caller does not supply an explicit byte count.
      sizeCalculation: (entry: CacheEntry) => safeOutputSize(entry.value) ?? 0,
      dispose: cacheLogger
        ? (_entry, key, reason) => {
            if (reason === 'evict') {
              cacheLogger.debug(
                `evicted step output [key=${key}] [cacheBytes=${this.lru.calculatedSize}]`
              );
            }
          }
        : undefined,
    });
  }

  public get(id: string, type: StepIoType): JsonValue | null | undefined {
    return this.lru.get(`${type}_${id}`)?.value;
  }

  /**
   * Stores a step IO value. When `bytes` is supplied it is used directly
   * (caller already knows the size, avoids a redundant JSON.stringify).
   * When omitted, `sizeCalculation` measures the entry automatically.
   */
  public set(id: string, type: StepIoType, value: JsonValue | null, bytes?: number): void {
    this.lru.set(`${type}_${id}`, { value }, bytes !== undefined ? { size: bytes } : undefined);
  }

  public has(id: string, type: StepIoType): boolean {
    return this.lru.has(`${type}_${id}`);
  }

  public delete(id: string, type: StepIoType): void {
    this.lru.delete(`${type}_${id}`);
  }

  public get totalBytes(): number {
    return this.lru.calculatedSize;
  }

  public get size(): number {
    return this.lru.size;
  }
}
