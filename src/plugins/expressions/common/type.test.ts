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

import { getType } from './type';

describe('getType()', () => {
  test('returns "null" string for null or undefined', () => {
    expect(getType(null)).toBe('null');
    expect(getType(undefined)).toBe('null');
  });

  test('returns basic type name', () => {
    expect(getType(0)).toBe('number');
    expect(getType(1)).toBe('number');
    expect(getType(0.8)).toBe('number');
    expect(getType(Infinity)).toBe('number');

    expect(getType(true)).toBe('boolean');
    expect(getType(false)).toBe('boolean');
  });

  test('returns .type property value of objects', () => {
    expect(getType({ type: 'foo' })).toBe('foo');
    expect(getType({ type: 'bar' })).toBe('bar');
  });

  test('throws if object has no .type property', () => {
    expect(() => getType({})).toThrow();
    expect(() => getType({ _type: 'foo' })).toThrow();
    expect(() => getType({ tipe: 'foo' })).toThrow();
  });
});
