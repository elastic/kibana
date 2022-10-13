/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PriorityMap } from './priority_map';

interface MyPrioType {
  readonly priority: number;
}

describe('PriorityMap', () => {
  it('sorts added keys by priority', () => {
    let map = new PriorityMap<string, MyPrioType>();
    map = map.add('a', { priority: 1 });
    map = map.add('b', { priority: 3 });
    map = map.add('c', { priority: 2 });
    expect([...map]).toEqual([
      ['b', { priority: 3 }],
      ['c', { priority: 2 }],
      ['a', { priority: 1 }],
    ]);
  });

  it('retains sort order when keys are removed', () => {
    let map = new PriorityMap<string, MyPrioType>();
    map = map.add('a', { priority: 1 });
    map = map.add('b', { priority: 3 });
    map = map.add('c', { priority: 2 });
    map = map.remove('c');
    expect([...map]).toEqual([
      ['b', { priority: 3 }],
      ['a', { priority: 1 }],
    ]);
  });

  it('adds duplicate priorities to end', () => {
    let map = new PriorityMap<string, MyPrioType>();
    map = map.add('a', { priority: 1 });
    map = map.add('b', { priority: 1 });
    map = map.add('c', { priority: 1 });
    expect([...map]).toEqual([
      ['a', { priority: 1 }],
      ['b', { priority: 1 }],
      ['c', { priority: 1 }],
    ]);
  });
});
