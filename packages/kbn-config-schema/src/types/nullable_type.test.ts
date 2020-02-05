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

test('returns string value when passed string', () => {
  const type = schema.nullable(schema.string());
  expect(type.validate('test')).toBe('test');
});

test('returns number value when passed number', () => {
  const type = schema.nullable(schema.number());
  expect(type.validate(42)).toBe(42);
});

test('returns boolean value when passed boolean', () => {
  const type = schema.nullable(schema.boolean());
  expect(type.validate(true)).toBe(true);
});

test('returns object value when passed object', () => {
  const type = schema.nullable(
    schema.object({
      foo: schema.number(),
      bar: schema.boolean(),
      baz: schema.string(),
    })
  );
  const object = {
    foo: 666,
    bar: true,
    baz: 'foo bar baz',
  };

  expect(type.validate(object)).toEqual(object);
});

test('returns null if null for string', () => {
  const type = schema.nullable(schema.string());
  expect(type.validate(null)).toBe(null);
});

test('returns null if null for number', () => {
  const type = schema.nullable(schema.number());
  expect(type.validate(null)).toBe(null);
});

test('returns null if null for boolean', () => {
  const type = schema.nullable(schema.boolean());
  expect(type.validate(null)).toBe(null);
});

test('returns null if undefined for string', () => {
  const type = schema.nullable(schema.string());
  expect(type.validate(undefined)).toBe(null);
});

test('returns null if undefined for number', () => {
  const type = schema.nullable(schema.number());
  expect(type.validate(undefined)).toBe(null);
});

test('returns null if undefined for boolean', () => {
  const type = schema.nullable(schema.boolean());
  expect(type.validate(undefined)).toBe(null);
});

test('returns null even if contained type has a default value', () => {
  const type = schema.nullable(
    schema.string({
      defaultValue: 'abc',
    })
  );

  expect(type.validate(undefined)).toBe(null);
});

test('validates contained type', () => {
  const type = schema.nullable(schema.string({ maxLength: 1 }));

  expect(() => type.validate('foo')).toThrowErrorMatchingSnapshot();
});

test('validates basic type', () => {
  const type = schema.nullable(schema.string());

  expect(() => type.validate(666)).toThrowErrorMatchingSnapshot();
});

test('validates type in object', () => {
  const type = schema.object({
    foo: schema.nullable(schema.string({ maxLength: 1 })),
    bar: schema.nullable(schema.boolean()),
  });

  expect(type.validate({ foo: 'a' })).toEqual({ foo: 'a', bar: null });
  expect(type.validate({ foo: null })).toEqual({ foo: null, bar: null });
  expect(type.validate({})).toEqual({ foo: null, bar: null });
  expect(type.validate({ bar: null })).toEqual({ foo: null, bar: null });
});

test('validates type errors in object', () => {
  const type = schema.object({
    foo: schema.nullable(schema.string({ maxLength: 1 })),
    bar: schema.nullable(schema.boolean()),
  });

  expect(() => type.validate({ foo: 'ab' })).toThrowErrorMatchingSnapshot();
});

test('includes namespace in failure', () => {
  const type = schema.nullable(schema.string({ maxLength: 1 }));

  expect(() => type.validate('foo', {}, 'foo-namespace')).toThrowErrorMatchingSnapshot();
});
