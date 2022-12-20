/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * LRU (Least Recently Used) Map a very lean and fast implementation on top
 * of the native Map class. It is used to cache the most recently used items.
 *
 * How it works: in native `Map` when new item is added it is added to the end
 * of the list. When we add a new item to the `LruMap` we check if the size of
 * the map is greater than the limit. If it is we delete the first item in the
 * list.
 */
export class LruMap<K, V> extends Map<K, V> {
  constructor(public readonly limit: number = Infinity) {
    super();
  }

  public set(key: K, value: V): this {
    super.set(key, value);
    if (this.size > this.limit) this.delete(super.keys().next().value);
    return this;
  }

  public get(key: K): V | undefined {
    if (!super.has(key)) return undefined;
    const value = super.get(key)!;
    super.delete(key);
    super.set(key, value);
    return value;
  }
}
