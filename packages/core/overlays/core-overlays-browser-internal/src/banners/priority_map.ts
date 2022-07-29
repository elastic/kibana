/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sortBy } from 'lodash';

interface PriorityValue {
  readonly priority: number;
}

/**
 * Immutable map that ensures entries are always in descending order based on
 * the values 'priority' property.
 */
export class PriorityMap<K, V extends PriorityValue> implements Iterable<[K, V]> {
  private readonly map: ReadonlyMap<K, V>;

  constructor(map?: ReadonlyMap<K, V>) {
    this.map = map ? new Map(sortEntries(map)) : new Map();
  }

  public add(key: K, value: V) {
    return new PriorityMap<K, V>(new Map<K, V>(sortEntries([...this.map, [key, value]])));
  }

  public remove(key: K) {
    return new PriorityMap<K, V>(
      new Map<K, V>([...this.map].filter(([itemKey]) => itemKey !== key))
    );
  }

  public has(key: K) {
    return this.map.has(key);
  }

  public [Symbol.iterator]() {
    return this.map[Symbol.iterator]();
  }

  public values() {
    return this.map.values();
  }
}

const sortEntries = <K, V extends PriorityValue>(map: Iterable<[K, V]>): Iterable<[K, V]> =>
  sortBy([...map] as Array<[K, V]>, '1.priority').reverse();
