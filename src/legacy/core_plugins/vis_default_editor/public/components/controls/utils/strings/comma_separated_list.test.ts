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

import { parseCommaSeparatedList } from './comma_separated_list';

describe('utils parseCommaSeparatedList()', () => {
  test('supports non-string values', () => {
    expect(parseCommaSeparatedList(0)).toEqual([]);
    expect(parseCommaSeparatedList(1)).toEqual(['1']);
    expect(parseCommaSeparatedList({})).toEqual(['[object Object]']);
    expect(parseCommaSeparatedList(() => {})).toEqual(['() => {}']);
    expect(parseCommaSeparatedList((a: any, b: any) => b)).toEqual(['(a', 'b) => b']);
    expect(parseCommaSeparatedList(/foo/)).toEqual(['/foo/']);
    expect(parseCommaSeparatedList(null)).toEqual([]);
    expect(parseCommaSeparatedList(undefined)).toEqual([]);
    expect(parseCommaSeparatedList(false)).toEqual([]);
    expect(parseCommaSeparatedList(true)).toEqual(['true']);
  });

  test('returns argument untouched if it is an array', () => {
    const inputs = [[], [1], ['foo,bar']];
    for (const input of inputs) {
      const json = JSON.stringify(input);
      expect(parseCommaSeparatedList(input)).toBe(input);
      expect(json).toBe(JSON.stringify(input));
    }
  });

  test('trims whitespace around elements', () => {
    expect(parseCommaSeparatedList('1 ,    2,    3     ,    4')).toEqual(['1', '2', '3', '4']);
  });

  test('ignored empty elements between multiple commas', () => {
    expect(parseCommaSeparatedList('foo , , ,,,,, ,      ,bar')).toEqual(['foo', 'bar']);
  });
});
