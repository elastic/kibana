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

import { forOwn } from 'lodash';
import { parseRange } from './range';

describe('Range parsing utility', () => {
  test('throws an error for inputs that are not formatted properly', () => {
    expect(() => {
      parseRange('');
    }).toThrowError(TypeError);

    expect(function() {
      parseRange('p10202');
    }).toThrowError(TypeError);

    expect(function() {
      parseRange('{0,100}');
    }).toThrowError(TypeError);

    expect(function() {
      parseRange('[0,100');
    }).toThrowError(TypeError);

    expect(function() {
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
    // eslint-disable-next-line jest/valid-describe
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
