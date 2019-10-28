/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
