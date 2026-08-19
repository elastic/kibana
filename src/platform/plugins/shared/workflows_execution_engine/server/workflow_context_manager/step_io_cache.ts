/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonValue } from '@kbn/utility-types';
import type { ByteLruCache } from './byte_lru_cache';

export type StepIoType = 'input' | 'output';

/**
 * Domain wrapper around {@link ByteLruCache} for step IO.
 *
 * Owns the key scheme (`${type}_${stepExecutionId}`) so raw key strings never
 * appear outside this class. Callers work with `(id, type)` pairs.
 *
 * Currently only outputs are cached (inputs go to state only). Caching inputs
 * later requires no API change — just remove the guard in `StepIoService.write`.
 */
export class StepIoCache {
  constructor(private readonly lru: ByteLruCache<string, JsonValue | null>) {}

  get(id: string, type: StepIoType): JsonValue | null | undefined {
    return this.lru.get(`${type}_${id}`);
  }

  set(id: string, type: StepIoType, value: JsonValue | null, bytes: number): void {
    this.lru.set(`${type}_${id}`, value, bytes);
  }

  has(id: string, type: StepIoType): boolean {
    return this.lru.has(`${type}_${id}`);
  }

  delete(id: string, type: StepIoType): void {
    this.lru.delete(`${type}_${id}`);
  }

  get totalBytes(): number {
    return this.lru.totalBytes;
  }

  get size(): number {
    return this.lru.size;
  }
}
