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
import { hasConfigPathIntersection } from './config';

describe('hasConfigPathIntersection()', () => {
  test('Should return true if leaf is descendent to the root', () => {
    expect(hasConfigPathIntersection('a.b', 'a.b')).toBe(true);
    expect(hasConfigPathIntersection('a.b.c', 'a')).toBe(true);
    expect(hasConfigPathIntersection('a.b.c.d', 'a.b')).toBe(true);
  });
  test('Should return false if leaf is not descendent to the root', () => {
    expect(hasConfigPathIntersection('a.bc', 'a.b')).toBe(false);
    expect(hasConfigPathIntersection('a', 'a.b')).toBe(false);
  });
  test('Should throw if either path is empty', () => {
    expect(() => hasConfigPathIntersection('a', '')).toThrow();
    expect(() => hasConfigPathIntersection('', 'a')).toThrow();
    expect(() => hasConfigPathIntersection('', '')).toThrow();
  });
});
