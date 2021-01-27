/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { transform, keys, startsWith } from 'lodash';

type IStorageEngine = typeof window.localStorage;

export enum StorageKeys {
  WIDTH = 'widths',
}

export class Storage {
  constructor(private readonly engine: IStorageEngine, private readonly prefix: string) {}

  encode(val: any) {
    return JSON.stringify(val);
  }

  decode(val: any) {
    if (typeof val === 'string') {
      return JSON.parse(val);
    }
  }

  encodeKey(key: string) {
    return `${this.prefix}${key}`;
  }

  decodeKey(key: string) {
    if (startsWith(key, this.prefix)) {
      return `${key.slice(this.prefix.length)}`;
    }
  }

  set(key: string, val: any) {
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

  delete(key: string) {
    return this.engine.removeItem(this.encodeKey(key));
  }

  keys(): string[] {
    return transform(keys(this.engine), (ours, key) => {
      const ourKey = this.decodeKey(key);
      if (ourKey != null) ours.push(ourKey);
    });
  }
}

export function createStorage(deps: { engine: IStorageEngine; prefix: string }) {
  return new Storage(deps.engine, deps.prefix);
}
