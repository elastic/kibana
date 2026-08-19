/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generic LRU cache bounded by total byte size rather than entry count.
 *
 * Entries are stored in a `Map` whose insertion order is the LRU order: the
 * head of the map (oldest insertion) is the LRU entry. On every `set` the key
 * is re-inserted at the tail (MRU position) after evicting as many LRU entries
 * as necessary to stay within `maxBytes`.
 *
 * Eviction only happens on `set`. Reads promote the accessed entry to MRU.
 */
export class ByteLruCache<K, V> {
  private readonly map = new Map<K, V>();
  private readonly sizes = new Map<K, number>();
  private _totalBytes = 0;

  constructor(readonly maxBytes: number) {}

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value === undefined) return undefined;
    // Promote to MRU by re-inserting at the tail.
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  set(key: K, value: V, bytes: number): void {
    if (this.map.has(key)) {
      this._totalBytes -= this.sizes.get(key)!;
      this.map.delete(key);
    }
    this.map.set(key, value);
    this.sizes.set(key, bytes);
    this._totalBytes += bytes;

    // Evict LRU entries (head of the map) until under budget.
    // The entry we just inserted is at the tail — stop before reaching it.
    for (const lruKey of this.map.keys()) {
      if (this._totalBytes <= this.maxBytes) break;
      if (lruKey === key) break;
      this._totalBytes -= this.sizes.get(lruKey)!;
      this.sizes.delete(lruKey);
      this.map.delete(lruKey);
    }
  }

  delete(key: K): void {
    if (!this.map.has(key)) return;
    this._totalBytes -= this.sizes.get(key)!;
    this.map.delete(key);
    this.sizes.delete(key);
  }

  get totalBytes(): number {
    return this._totalBytes;
  }

  get size(): number {
    return this.map.size;
  }
}
