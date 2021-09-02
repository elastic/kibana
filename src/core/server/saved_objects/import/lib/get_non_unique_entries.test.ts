/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ObjectKeyProvider } from './get_object_key';
import { getNonUniqueEntries } from './get_non_unique_entries';

const foo1 = { type: 'foo', id: '1' };
const foo2 = { type: 'foo', id: '2' }; // same type as foo1, different ID
const bar1 = { type: 'bar', id: '1' }; // same ID as foo1, different type

describe('#getNonUniqueEntries', () => {
  let getObjKey: jest.MockedFunction<ObjectKeyProvider>;

  beforeEach(() => {
    getObjKey = jest.fn().mockImplementation(({ type, id }) => `${type}:${id}`);
  });

  it('returns empty array if entries are unique', () => {
    expect(getNonUniqueEntries([foo1, foo2, bar1], getObjKey)).toEqual([]);
  });

  it('calls `getObjKey` with each object', () => {
    getNonUniqueEntries([foo1, foo2, bar1], getObjKey);

    expect(getObjKey).toHaveBeenCalledTimes(3);
    expect(getObjKey).toHaveBeenCalledWith(foo1);
    expect(getObjKey).toHaveBeenCalledWith(foo2);
    expect(getObjKey).toHaveBeenCalledWith(bar1);
  });

  it('returns non-empty array for non-unique results', () => {
    expect(getNonUniqueEntries([foo1, foo2, foo1], getObjKey)).toEqual([`${foo1.type}:${foo1.id}`]);
  });

  it('returns all the duplicates', () => {
    expect(getNonUniqueEntries([foo1, foo2, foo1, foo2], getObjKey)).toEqual([
      `${foo1.type}:${foo1.id}`,
      `${foo2.type}:${foo2.id}`,
    ]);
  });
});
