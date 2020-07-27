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

import { fromNullable } from '../maybe';

describe(`maybe algebraic datatype functions`, () => {
  const pluck = (x) => (obj) => obj[x];
  const attempt = (obj) => fromNullable(obj).map(pluck('detail'));
  describe(`helpers`, () => {
    it(`'fromNullable' should be a fn`, () => {
      expect(typeof fromNullable).toBe('function');
    });
  });
  describe(`'fromNullable`, () => {
    it(`should continue processing if a truthy is calculated`, () => {
      expect(attempt({ detail: 'x' }).value()).toBe('x');
    });
    it(`should drop processing if a falsey is calculated`, () => {
      const obj = {
        a: 'abc',
      };

      expect(fromNullable(obj.b).inspect()).toBe('[Nothing]');
    });
  });
});
