/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export class SetMap<Key, Value> {
  private readonly map = new Map<Key, Set<Value>>();

  add(key: Key, value: Value) {
    const group = this.map.get(key);
    if (!group) {
      this.map.set(key, new Set([value]));
    } else {
      group.add(value);
    }
  }

  get(key: Key) {
    return this.map.get(key);
  }

  keys() {
    return this.map.keys();
  }

  values() {
    return this.map.values();
  }

  [Symbol.iterator]() {
    return this.map[Symbol.iterator]();
  }
}
