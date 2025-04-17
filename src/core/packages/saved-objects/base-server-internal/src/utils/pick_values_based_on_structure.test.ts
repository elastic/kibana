/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import deepMerge from 'deepmerge';
import { fc } from '@fast-check/jest';
import { pickValuesBasedOnStructure, getFlattenedKeys } from './pick_values_based_on_structure';
import { isPlainObject } from 'lodash';

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

  test('special case: empty arrays and objects', () => {
    const a = { v1: 'a', v2: [], v3: {} };
    const b = {
      v1: 'b',
      v2: [{ c: 2, d: 2 }, { e: 4 }],
      v3: { a: 1 },
      another: 'value',
      anArray: [1, 2, 3],
    };

    expect(pickValuesBasedOnStructure(a, b)).toEqual({ v1: 'b', v2: [], v3: {} });
  });

  test('special case: only selects own properties', () => {
    const source = {};
    Object.defineProperty(source, '__proto__', { enumerable: true, value: 1 });
    const target = {};
    expect(pickValuesBasedOnStructure(source, target)).toEqual({});
  });

  test('special case: only selects own properties deeply', () => {
    const poisened = {};
    Object.defineProperty(poisened, '__proto__', { enumerable: true, value: 1 });
    Object.defineProperty(poisened, 'a', { enumerable: true, value: 1 });
    const source = { arr: [poisened] };
    const target = { arr: [{ a: 1 }] };
    expect(pickValuesBasedOnStructure(source, target)).toEqual({ arr: [{ a: 1 }] });
  });

  test('can extract structure map when present in target', () => {
    /**
     * The `keys` `Arbitrary` represents words with possible numbers like `loremv123`
     * that might be used in saved objects as property names.
     *
     * We genereate 10 of them to promote key collisions. Something like: ['loremV123', 'ipsum.doleres'...]
     */
    const arbKeys = fc
      .array(
        fc.tuple(
          fc.lorem({ mode: 'words', maxCount: 1 }),
          fc.option(fc.nat({ max: 1_000 })),
          fc.option(fc.constant('.'))
        ),
        {
          minLength: 1,
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

    const arbObjects = arbKeys.chain((ks) =>
      fc.tuple(
        fc.object({ key: fc.constantFrom(...ks), depthSize: 6, maxKeys: 100 }),
        fc.object({ key: fc.constantFrom(...ks), depthSize: 6, maxKeys: 100 })
      )
    );

    fc.assert(
      fc.property(arbObjects, ([objA, objB]) => {
        const target = deepMerge(objB, objA, { arrayMerge }) as object;
        const result = pickValuesBasedOnStructure(objA, target);
        expect(result).toEqual(objA);
      }),
      { verbose: true, numRuns: 1_000 }
    );
  });
});

const arrayMerge = (targetArray: unknown[], sourceArray: unknown[]) => {
  const dest = targetArray.slice();
  sourceArray.forEach((srcItem, idx) => {
    if (
      (Array.isArray(dest[idx]) && Array.isArray(srcItem)) ||
      (isPlainObject(dest[idx]) && isPlainObject(srcItem))
    ) {
      dest[idx] = deepMerge(dest[idx] as object, srcItem as object, { arrayMerge });
    } else {
      dest[idx] = srcItem;
    }
  });
  return dest;
};
