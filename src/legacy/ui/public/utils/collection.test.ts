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

import { move } from './collection';

describe('collection', () => {
  describe('move', () => {
    test('accepts previous from->to syntax', () => {
      const list = [1, 1, 1, 1, 1, 1, 1, 1, 8, 1, 1];

      expect(list[3]).toBe(1);
      expect(list[8]).toBe(8);

      move(list, 8, 3);

      expect(list[8]).toBe(1);
      expect(list[3]).toBe(8);
    });

    test('moves an object up based on a function callback', () => {
      const list = [1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1];

      expect(list[4]).toBe(0);
      expect(list[5]).toBe(1);
      expect(list[6]).toBe(0);

      move(list, 5, false, (v: any) => v === 0);

      expect(list[4]).toBe(1);
      expect(list[5]).toBe(0);
      expect(list[6]).toBe(0);
    });

    test('moves an object down based on a function callback', () => {
      const list = [1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1];

      expect(list[4]).toBe(0);
      expect(list[5]).toBe(1);
      expect(list[6]).toBe(0);

      move(list, 5, true, (v: any) => v === 0);

      expect(list[4]).toBe(0);
      expect(list[5]).toBe(0);
      expect(list[6]).toBe(1);
    });

    test('moves an object up based on a where callback', () => {
      const list = [
        { v: 1 },
        { v: 1 },
        { v: 1 },
        { v: 1 },
        { v: 0 },
        { v: 1 },
        { v: 0 },
        { v: 1 },
        { v: 1 },
        { v: 1 },
        { v: 1 },
      ];

      expect(list[4]).toHaveProperty('v', 0);
      expect(list[5]).toHaveProperty('v', 1);
      expect(list[6]).toHaveProperty('v', 0);

      move(list, 5, false, { v: 0 });

      expect(list[4]).toHaveProperty('v', 1);
      expect(list[5]).toHaveProperty('v', 0);
      expect(list[6]).toHaveProperty('v', 0);
    });

    test('moves an object down based on a where callback', () => {
      const list = [
        { v: 1 },
        { v: 1 },
        { v: 1 },
        { v: 1 },
        { v: 0 },
        { v: 1 },
        { v: 0 },
        { v: 1 },
        { v: 1 },
        { v: 1 },
        { v: 1 },
      ];

      expect(list[4]).toHaveProperty('v', 0);
      expect(list[5]).toHaveProperty('v', 1);
      expect(list[6]).toHaveProperty('v', 0);

      move(list, 5, true, { v: 0 });

      expect(list[4]).toHaveProperty('v', 0);
      expect(list[5]).toHaveProperty('v', 0);
      expect(list[6]).toHaveProperty('v', 1);
    });

    test('moves an object down based on a pluck callback', () => {
      const list = [
        { id: 0, normal: true },
        { id: 1, normal: true },
        { id: 2, normal: true },
        { id: 3, normal: true },
        { id: 4, normal: true },
        { id: 5, normal: false },
        { id: 6, normal: true },
        { id: 7, normal: true },
        { id: 8, normal: true },
        { id: 9, normal: true },
      ];

      expect(list[4]).toHaveProperty('id', 4);
      expect(list[5]).toHaveProperty('id', 5);
      expect(list[6]).toHaveProperty('id', 6);

      move(list, 5, true, 'normal');

      expect(list[4]).toHaveProperty('id', 4);
      expect(list[5]).toHaveProperty('id', 6);
      expect(list[6]).toHaveProperty('id', 5);
    });
  });
});
