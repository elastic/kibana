/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * A class for collecting items (V) based on some key (K)
 */
export class SetMap<K, V> {
  private sets = new Map<K, Set<V>>();

  /**
   * Is there a group for the `key`?
   */
  has(key: K) {
    return this.sets.has(key);
  }

  /**
   * Add a value to the group with `key`, if the group doesn't exist
   * yet it is created.
   */
  add(key: K, value: V) {
    const set = this.sets.get(key);
    if (set) {
      set.add(value);
    } else {
      this.sets.set(key, new Set([value]));
    }
  }

  /**
   * Get the group for the `key`, if the group doesn't exist then
   * `undefined` is returned.
   */
  get(key: K): Set<V> | undefined {
    return this.sets.get(key);
  }

  /**
   * Returns an iterator for the [K, V] entries stored in the SetMap
   */
  values() {
    return this.sets.values();
  }
}
