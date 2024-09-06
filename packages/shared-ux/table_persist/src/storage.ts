/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LOCAL_STORAGE_PREFIX } from './constants';

type IStorageEngine = typeof window.localStorage;

class Storage {
  engine: IStorageEngine = window.localStorage;
  prefix: string = LOCAL_STORAGE_PREFIX;

  encode(val: unknown) {
    return JSON.stringify(val);
  }

  decode(val: string | null) {
    if (typeof val === 'string') {
      return JSON.parse(val);
    }
  }

  encodeKey(key: string) {
    return `${this.prefix}:${key}`;
  }

  set(key: string, val: unknown) {
    this.engine.setItem(this.encodeKey(key), this.encode(val));
    return val;
  }

  has(key: string) {
    return this.engine.getItem(this.encodeKey(key)) != null;
  }

  get<T>(key: string, _default?: T) {
    if (this.has(key)) {
      return this.decode(this.engine.getItem(this.encodeKey(key)));
    } else {
      return _default;
    }
  }
}

export function createStorage() {
  return new Storage();
}
