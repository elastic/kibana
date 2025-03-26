/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fc } from '@fast-check/jest';
import { pickValuesBasedOnStructure, getFlattenedKeys } from './pick_values_based_on_structure';

describe('getFlattenedKeys', () => {
  test('empty object', () => {
    expect(getFlattenedKeys({}).sort()).toEqual([]);
  });

  test('simple object', () => {
    expect(getFlattenedKeys({ a: 1, b: 2, c: 3 }).sort()).toEqual(['["a"]', '["b"]', '["c"]']);
  });

  test('simple object 2', () => {
    const obj = {
      a: {},
    };
    expect(getFlattenedKeys(obj).sort()).toEqual(['["a"]']);
  });

  test('simple object 3', () => {
    const obj = {
      a: [[]],
    };
    expect(getFlattenedKeys(obj).sort()).toEqual(['["a"][0]']);
  });

  test('complex object 1', () => {
    const obj = {
      a: 1,
      b: { c: 2 },
      d: [{ e: 1 }, { e: 2 }],
    };

    expect(getFlattenedKeys(obj).sort()).toEqual([
      '["a"]',
      '["b"]["c"]',
      '["d"][0]["e"]',
      '["d"][1]["e"]',
    ]);
  });
});

describe('pickValuesBasedOnStructure', () => {
  test('picks the values of the target', () => {
    const a = { v1: 'a', v2: [{ c: 1, d: 1 }] };
    const b = { v1: 'b', v2: [{ c: 2, d: 2 }, { e: 4 }], another: 'value', anArray: [1, 2, 3] };

    expect(pickValuesBasedOnStructure(a, b)).toEqual({ v1: 'b', v2: [{ c: 2, d: 2 }] });
  });
  test('picks a subset of values from target', () => {
    /**
     * The `keys` `Arbitrary` represents words with possible numbers like `loremv123`
     * that might be used in saved objects as key names.
     */
    const keys = fc
      .array(
        fc.tuple(
          fc.lorem({ mode: 'words', maxCount: 1 }),
          fc.option(fc.nat({ max: 1_000 })),
          fc.option(fc.constant('.'))
        ),
        {
          minLength: 10,
          maxLength: 10,
        }
      )
      .chain((pairs) => {
        const ks = pairs.map(([word, num, period]) => {
          let result = word;
          if (num != null) result += `v${num}`; // some keys might have a number
          if (period != null) result += `${period}${word}`; // some keys might have a period
          return result;
        });
        return fc.constantFrom(ks);
      });

    const arbObjectA = keys.chain((ks) =>
      fc.object({ key: fc.constantFrom(...ks), depthSize: 6, maxKeys: 100 })
    );
    const arbObjectB = keys.chain((ks) =>
      fc.object({ key: fc.constantFrom(...ks), depthSize: 6, maxKeys: 100 })
    );

    fc.assert(
      fc.property(arbObjectA, arbObjectB, (objA, objB) => {
        const target = Object.assign({}, objB, objA) as object;
        const result = pickValuesBasedOnStructure(objA, target);
        expect(result).toEqual(objA);
      }),
      { verbose: true, numRuns: 1_000 }
    );
  });
});
