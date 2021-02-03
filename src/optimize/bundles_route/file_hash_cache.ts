/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import LruCache from 'lru-cache';

export class FileHashCache {
  private lru = new LruCache<string, Promise<string>>(100);

  get(key: string) {
    return this.lru.get(key);
  }

  set(key: string, value: Promise<string>) {
    this.lru.set(key, value);
  }

  del(key: string) {
    this.lru.del(key);
  }
}
