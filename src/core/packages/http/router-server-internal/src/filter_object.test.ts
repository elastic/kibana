/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filterObject } from './filter_object';

test('extract provided paths from objects', () => {
  const object = { a: 1, b: { c: 2, d: 3 } };
  expect(filterObject(object, ['a', 'b.c'])).toEqual({
    a: 1,
    b: { c: 2 },
  });
});

test.each([
  { name: 'empty array', input: [[], ['0']], output: [] },
  { name: 'does not accept array selectors', input: [[1, 2, 3], ['0']], output: [] },
  {
    name: 'array of objects',
    input: [[{ a: 1 }, { a: 2, b: 3 }], ['a']],
    output: [{ a: 1 }, { a: 2 }],
  },
  {
    name: 'array of objects 2',
    input: [[{ a: 1 }, { a: 2, b: 3 }, { a: { b: 2 } }], ['a.b']],
    output: [{ a: { b: 2 } }],
  },
  {
    name: 'does not accept array selectors with array of objects',
    input: [[{ a: 1 }, { a: 2 }], ['0.a']],
    output: [],
  },
  {
    name: 'object of arrays',
    input: [{ a: [1, 2] }, ['a']],
    output: { a: [1, 2] },
  },
  {
    name: 'does not acccept array selectors with object of arrays',
    input: [{ a: [1, 2] }, ['a.0']],
    output: {},
  },
  {
    name: 'heavily nested arrays',
    input: [[[[[[{ a: 1 }]]]]], ['a']],
    output: [[[[[{ a: 1 }]]]]],
  },
  {
    name: 'heavily nested arrays part 2',
    input: [{ a: [[[[[{ b: 1 }, { c: 2 }]]]]] }, ['a.b']],
    output: { a: [[[[[{ b: 1 }]]]]] },
  },
])('traverse arrays: $name', ({ input: [a, b], output }) => {
  expect(filterObject(a, b as string[])).toEqual(output);
});
