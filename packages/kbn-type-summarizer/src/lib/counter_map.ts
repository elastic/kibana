/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * A simple Map wrapper which counts the number of times a value `K` is
 * passed to `incr()`.
 */
export class CounterMap<K> {
  private counters = new Map<K, number>();

  incr(key: K, by: number = 1) {
    this.counters.set(key, (this.counters.get(key) ?? 0) + by);
  }

  get(key: K): number {
    return this.counters.get(key) ?? 0;
  }
}
