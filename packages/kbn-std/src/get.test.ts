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

import { get } from './get';

const obj = {
  bar: {
    quux: 123,
  },
  'dotted.value': 'dots',
  foo: 'value',
};

test('get with string', () => {
  const value = get(obj, 'foo');
  expect(value).toBe('value');
});

test('get with array', () => {
  const value = get(obj, ['bar', 'quux']);
  expect(value).toBe(123);
});

test('throws if dot in string', () => {
  expect(() => {
    get(obj, 'dotted.value');
  }).toThrowErrorMatchingSnapshot();
});

test('does not throw if dot in array', () => {
  const value = get(obj, ['dotted.value']);
  expect(value).toBe('dots');
});
