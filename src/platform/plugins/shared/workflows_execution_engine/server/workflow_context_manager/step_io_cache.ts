/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonValue } from '@kbn/utility-types';
import { LRUCache } from 'lru-cache';

export type StepIoType = 'input' | 'output';

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
  private readonly lru: LRUCache<string, JsonValue | null>;

  constructor(maxBytes: number) {
    this.lru = new LRUCache({ maxSize: maxBytes });
  }

  get(id: string, type: StepIoType): JsonValue | null | undefined {
    return this.lru.get(`${type}_${id}`);
  }

  set(id: string, type: StepIoType, value: JsonValue | null, bytes: number): void {
    this.lru.set(`${type}_${id}`, value, { size: bytes });
  }

  has(id: string, type: StepIoType): boolean {
    return this.lru.has(`${type}_${id}`);
  }

  delete(id: string, type: StepIoType): void {
    this.lru.delete(`${type}_${id}`);
  }

  get totalBytes(): number {
    return this.lru.calculatedSize;
  }

  get size(): number {
    return this.lru.size;
  }
}
