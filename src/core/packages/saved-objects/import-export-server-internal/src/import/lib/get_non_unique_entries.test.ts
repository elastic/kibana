/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getNonUniqueEntries } from './get_non_unique_entries';

const foo1 = { type: 'foo', id: '1' };
const foo2 = { type: 'foo', id: '2' }; // same type as foo1, different ID
const bar1 = { type: 'bar', id: '1' }; // same ID as foo1, different type

describe('#getNonUniqueEntries', () => {
  test('returns empty array if entries are unique', () => {
    const result = getNonUniqueEntries([foo1, foo2, bar1]);
    expect(result).toEqual([]);
  });

  test('returns non-empty array for non-unique results', () => {
    const result1 = getNonUniqueEntries([foo1, foo2, foo1]);
    const result2 = getNonUniqueEntries([foo1, foo2, foo1, foo2]);
    expect(result1).toEqual([`${foo1.type}:${foo1.id}`]);
    expect(result2).toEqual([`${foo1.type}:${foo1.id}`, `${foo2.type}:${foo2.id}`]);
  });
});
