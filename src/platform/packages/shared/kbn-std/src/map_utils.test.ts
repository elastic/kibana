/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mapValuesOfMap, groupIntoMap } from './map_utils';

describe('groupIntoMap', () => {
  it('returns an empty map when there are no items to map', () => {
    const groupBy = jest.fn();

    expect(groupIntoMap([], groupBy)).toEqual(new Map());
    expect(groupBy).not.toHaveBeenCalled();
  });

  it('calls groupBy for each item in the collection', () => {
    const groupBy = jest.fn();

    groupIntoMap([{ id: 1 }, { id: 2 }, { id: 3 }], groupBy);

    expect(groupBy).toHaveBeenCalledTimes(3);
    expect(groupBy).toHaveBeenCalledWith({ id: 1 });
    expect(groupBy).toHaveBeenCalledWith({ id: 2 });
    expect(groupBy).toHaveBeenCalledWith({ id: 3 });
  });

  it('returns each item in the key returned by groupBy', () => {
    const groupBy = (item: { id: number }) => item.id;

    expect(groupIntoMap([{ id: 1 }, { id: 2 }, { id: 3 }], groupBy)).toEqual(
      new Map([
        [1, [{ id: 1 }]],
        [2, [{ id: 2 }]],
        [3, [{ id: 3 }]],
      ])
    );
  });

  it('groups items under the same key returned by groupBy', () => {
    const groupBy = (item: { id: number }) => (item.id % 2 === 0 ? 'even' : 'odd');

    const expectedResult = new Map();
    expectedResult.set('even', [{ id: 2 }]);
    expectedResult.set('odd', [{ id: 1 }, { id: 3 }]);
    expect(groupIntoMap([{ id: 1 }, { id: 2 }, { id: 3 }], groupBy)).toEqual(expectedResult);
  });

  it('supports Symbols as keys', () => {
    const even = Symbol('even');
    const odd = Symbol('odd');
    const groupBy = (item: { id: number }) => (item.id % 2 === 0 ? even : odd);

    const expectedResult = new Map();
    expectedResult.set(even, [{ id: 2 }]);
    expectedResult.set(odd, [{ id: 1 }, { id: 3 }]);
    expect(groupIntoMap([{ id: 1 }, { id: 2 }, { id: 3 }], groupBy)).toEqual(expectedResult);
  });
});

describe('mapValuesOfMap', () => {
  it('applys the mapper to each value in a map', () => {
    const mapper = jest.fn();

    const even = Symbol('even');
    const odd = Symbol('odd');

    const map = new Map();
    map.set(even, 2);
    map.set(odd, 1);

    mapValuesOfMap(map, mapper);
    expect(mapper).toHaveBeenCalledWith(1);
    expect(mapper).toHaveBeenCalledWith(2);
  });

  it('returns a new map with each value mapped to the value returned by the mapper', () => {
    const mapper = (i: number) => i * 3;

    const even = Symbol('even');
    const odd = Symbol('odd');

    const map = new Map();
    map.set(even, 2);
    map.set(odd, 1);

    expect(mapValuesOfMap(map, mapper)).toEqual(
      new Map([
        [even, 6],
        [odd, 3],
      ])
    );
    expect(map.get(odd)).toEqual(1);
    expect(map.get(even)).toEqual(2);
  });
});
