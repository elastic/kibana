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

test('works for any value', () => {
  expect(schema.any().validate(true)).toBe(true);
  expect(schema.any().validate(100)).toBe(100);
  expect(schema.any().validate('foo')).toBe('foo');
  expect(schema.any().validate(null)).toBe(null);
  expect(schema.any().validate({ foo: 'bar', baz: 2 })).toEqual({ foo: 'bar', baz: 2 });
});

test('is required by default', () => {
  expect(() => schema.any().validate(undefined)).toThrowErrorMatchingSnapshot();
});

test('includes namespace in failure', () => {
  expect(() =>
    schema.any().validate(undefined, {}, 'foo-namespace')
  ).toThrowErrorMatchingSnapshot();
});

describe('#defaultValue', () => {
  test('returns default when undefined', () => {
    expect(schema.any({ defaultValue: true }).validate(undefined)).toBe(true);
    expect(schema.any({ defaultValue: 200 }).validate(undefined)).toBe(200);
    expect(schema.any({ defaultValue: 'bar' }).validate(undefined)).toBe('bar');
    expect(schema.any({ defaultValue: { baz: 'foo' } }).validate(undefined)).toEqual({
      baz: 'foo',
    });
  });

  test('returns value when specified', () => {
    expect(schema.any({ defaultValue: true }).validate(false)).toBe(false);
    expect(schema.any({ defaultValue: 200 }).validate(100)).toBe(100);
    expect(schema.any({ defaultValue: 'bar' }).validate('foo')).toBe('foo');
    expect(schema.any({ defaultValue: 'not-null' }).validate(null)).toBe(null);
    expect(schema.any({ defaultValue: { baz: 'foo' } }).validate({ foo: 'bar', baz: 2 })).toEqual({
      foo: 'bar',
      baz: 2,
    });
  });
});
