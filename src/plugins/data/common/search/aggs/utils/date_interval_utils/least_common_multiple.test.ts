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

import { leastCommonMultiple } from './least_common_multiple';

describe('leastCommonMultiple', () => {
  const tests: Array<[number, number, number]> = [
    [3, 5, 15],
    [1, 1, 1],
    [5, 6, 30],
    [3, 9, 9],
    [8, 20, 40],
    [5, 5, 5],
    [0, 5, 0],
    [-4, -5, 20],
    [-2, -3, 6],
    [-8, 2, 8],
    [-8, 5, 40],
  ];

  tests.map(([a, b, expected]) => {
    test(`should return ${expected} for leastCommonMultiple(${a}, ${b})`, () => {
      expect(leastCommonMultiple(a, b)).toBe(expected);
    });
  });
});
