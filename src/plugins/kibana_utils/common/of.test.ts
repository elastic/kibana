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

import { of } from './of';

describe('of()', () => {
  describe('when promise resolves', () => {
    const promise = new Promise((resolve) => resolve()).then(() => 123);

    test('first member of 3-tuple is the promise value', async () => {
      const [result] = await of(promise);
      expect(result).toBe(123);
    });

    test('second member of 3-tuple is undefined', async () => {
      const [, error] = await of(promise);
      expect(error).toBe(undefined);
    });

    test('third, flag member, of 3-tuple is true', async () => {
      const [, , resolved] = await of(promise);
      expect(resolved).toBe(true);
    });
  });

  describe('when promise rejects', () => {
    const promise = new Promise((resolve) => resolve()).then(() => {
      // eslint-disable-next-line no-throw-literal
      throw 123;
    });

    test('first member of 3-tuple is undefined', async () => {
      const [result] = await of(promise);
      expect(result).toBe(undefined);
    });

    test('second member of 3-tuple is thrown error', async () => {
      const [, error] = await of(promise);
      expect(error).toBe(123);
    });

    test('third, flag member, of 3-tuple is false', async () => {
      const [, , resolved] = await of(promise);
      expect(resolved).toBe(false);
    });
  });
});
