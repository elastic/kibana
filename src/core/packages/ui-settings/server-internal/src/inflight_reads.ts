/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shares one in-flight read per key and drops it when the read settles.
 */
export class InflightReads<T> {
  private readonly reads = new Map<string, Promise<T>>();

  run(key: string, read: () => Promise<T>): Promise<T> {
    const current = this.reads.get(key);
    if (current) {
      return current;
    }

    const promise = read().finally(() => {
      if (this.reads.get(key) === promise) {
        this.reads.delete(key);
      }
    });
    this.reads.set(key, promise);
    return promise;
  }
}
