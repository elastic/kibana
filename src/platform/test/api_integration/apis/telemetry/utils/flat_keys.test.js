/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * It's a JS file because we cannot use Jest types in here because of a clash in the `expect` types
 */

import { flatKeys } from './flat_keys';

describe(`flatKeys`, () => {
  test('no keys to be listed', () => {
    expect(flatKeys({})).toStrictEqual([]);
  });
  test('one-level list', () => {
    expect(
      flatKeys({
        prop1: 1,
        prop2: 'a',
        prop3: true,
        prop4: [],
      })
    ).toStrictEqual(['prop1', 'prop2', 'prop3', 'prop4']);
  });
  test('two-level list', () => {
    expect(
      flatKeys({
        prop1: 1,
        prop2: 'a',
        prop3: true,
        prop4: [],
        prop5: [1],
        prop6: {
          prop6_1: 1,
        },
      })
    ).toStrictEqual(['prop1', 'prop2', 'prop3', 'prop4', 'prop5.0', 'prop6.prop6_1']);
  });
  test('three-level list', () => {
    expect(
      flatKeys({
        prop1: 1,
        prop2: 'a',
        prop3: true,
        prop4: [],
        prop5: [1],
        prop6: {
          prop6_1: 1,
          prop6_2: {
            prop6_2_1: 1,
          },
        },
        prop7: [{ a: 1, b: [] }],
        prop8: [1, true, { a: 1 }],
      })
    ).toStrictEqual([
      'prop1',
      'prop2',
      'prop3',
      'prop4',
      'prop5.0',
      'prop6.prop6_1',
      'prop6.prop6_2.prop6_2_1',
      'prop7.0.a',
      'prop7.0.b',
      'prop8.0',
      'prop8.1',
      'prop8.2.a',
    ]);
  });
  test('four-level+ list: it stays at 3 levels only', () => {
    expect(
      flatKeys({
        prop1: 1,
        prop2: 'a',
        prop3: true,
        prop4: [],
        prop5: [1],
        prop6: {
          prop6_1: 1,
          prop6_2: {
            prop6_2_1: 1,
            prop6_2_2: {
              prop6_2_2_1: 1,
            },
          },
        },
        prop7: [{ a: 1, b: [], c: [1], d: [{ a: 1 }], e: [1, { a: 1 }] }],
        prop8: [1, true, { a: 1 }],
      })
    ).toStrictEqual([
      'prop1',
      'prop2',
      'prop3',
      'prop4',
      'prop5.0',
      'prop6.prop6_1',
      'prop6.prop6_2.prop6_2_1',
      'prop6.prop6_2.prop6_2_2',
      // 'prop6.prop6_2.prop6_2_2.prop6_2_2_1',  Not reported because of the depth-limit
      'prop7.0.a',
      'prop7.0.b',
      'prop7.0.c',
      // 'prop7.0.c.0', Not reported because of the depth-limit
      'prop7.0.d',
      // 'prop7.0.d.0.a', Not reported because of the depth-limit
      'prop7.0.e',
      // 'prop7.0.e.0', Not reported because of the depth-limit
      // 'prop7.0.e.1.a', Not reported because of the depth-limit
      'prop8.0',
      'prop8.1',
      'prop8.2.a',
    ]);
  });
});
