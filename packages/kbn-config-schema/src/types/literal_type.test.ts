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

import { schema } from '..';

const { literal } = schema;

test('handles string', () => {
  expect(literal('test').validate('test')).toBe('test');
});

test('handles boolean', () => {
  expect(literal(false).validate(false)).toBe(false);
});

test('handles number', () => {
  expect(literal(123).validate(123)).toBe(123);
});

test('handles null', () => {
  expect(literal(null).validate(null)).toBe(null);
});

test('returns error when not correct', () => {
  expect(() => literal('test').validate('foo')).toThrowErrorMatchingSnapshot();

  expect(() => literal(true).validate(false)).toThrowErrorMatchingSnapshot();

  expect(() => literal('test').validate([1, 2, 3])).toThrowErrorMatchingSnapshot();

  expect(() => literal(123).validate('abc')).toThrowErrorMatchingSnapshot();

  expect(() => literal(null).validate(42)).toThrowErrorMatchingSnapshot();
});

test('includes namespace in failure', () => {
  expect(() => literal('test').validate('foo', {}, 'foo-namespace')).toThrowErrorMatchingSnapshot();
});
