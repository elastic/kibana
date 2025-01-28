/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { forOwn } from 'lodash';
import { parseRange } from './range';

describe('Range parsing utility', () => {
  test('throws an error for inputs that are not formatted properly', () => {
    expect(() => {
      parseRange('');
    }).toThrowError(TypeError);

    expect(function () {
      parseRange('p10202');
    }).toThrowError(TypeError);

    expect(function () {
      parseRange('{0,100}');
    }).toThrowError(TypeError);

    expect(function () {
      parseRange('[0,100');
    }).toThrowError(TypeError);

    expect(function () {
      parseRange(')0,100(');
    }).toThrowError(TypeError);
  });

  const tests = {
    '[ 0 , 100 ]': {
      props: {
        min: 0,
        max: 100,
        minInclusive: true,
        maxInclusive: true,
      },
      within: [
        [0, true],
        [0.0000001, true],
        [1, true],
        [99.99999, true],
        [100, true],
      ],
    },
    '(26.3   ,   42]': {
      props: {
        min: 26.3,
        max: 42,
        minInclusive: false,
        maxInclusive: true,
      },
      within: [
        [26.2999999, false],
        [26.3000001, true],
        [30, true],
        [41, true],
        [42, true],
      ],
    },
    '(-50,50)': {
      props: {
        min: -50,
        max: 50,
        minInclusive: false,
        maxInclusive: false,
      },
      within: [
        [-50, false],
        [-49.99999, true],
        [0, true],
        [49.99999, true],
        [50, false],
      ],
    },
    '(Infinity, -Infinity)': {
      props: {
        min: -Infinity,
        max: Infinity,
        minInclusive: false,
        maxInclusive: false,
      },
      within: [
        [0, true],
        [-0.0000001, true],
        [-1, true],
        [-10000000000, true],
        [-Infinity, false],
        [Infinity, false],
      ],
    },
  };

  forOwn(tests, (spec, str: any) => {
    describe(str, () => {
      const range = parseRange(str);

      it('creation', () => {
        expect(range).toEqual(spec.props);
      });

      spec.within.forEach((tup: any[]) => {
        it('#within(' + tup[0] + ')', () => {
          expect(range.within(tup[0])).toBe(tup[1]);
        });
      });
    });
  });
});
