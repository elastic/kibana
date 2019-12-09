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

test('handles string', () => {
  expect(schema.oneOf([schema.string()]).validate('test')).toBe('test');
});

test('handles string with default', () => {
  const type = schema.oneOf([schema.string()], {
    defaultValue: 'test',
  });

  expect(type.validate(undefined)).toBe('test');
});

test('handles number', () => {
  expect(schema.oneOf([schema.number()]).validate(123)).toBe(123);
});

test('handles number with default', () => {
  const type = schema.oneOf([schema.number()], {
    defaultValue: 123,
  });

  expect(type.validate(undefined)).toBe(123);
});

test('handles literal', () => {
  const type = schema.oneOf([schema.literal('foo')]);

  expect(type.validate('foo')).toBe('foo');
});

test('handles literal with default', () => {
  const type = schema.oneOf([schema.literal('foo')], {
    defaultValue: 'foo',
  });

  expect(type.validate(undefined)).toBe('foo');
});

test('handles multiple literals with default', () => {
  const type = schema.oneOf([schema.literal('foo'), schema.literal('bar')], {
    defaultValue: 'bar',
  });

  expect(type.validate('foo')).toBe('foo');
  expect(type.validate(undefined)).toBe('bar');
});

test('handles object', () => {
  const type = schema.oneOf([schema.object({ name: schema.string() })]);

  expect(type.validate({ name: 'foo' })).toEqual({ name: 'foo' });
});

test('handles object with wrong type', () => {
  const type = schema.oneOf([schema.object({ age: schema.number() })]);

  expect(() => type.validate({ age: 'foo' })).toThrowErrorMatchingSnapshot();
});

test('includes namespace in failure', () => {
  const type = schema.oneOf([schema.object({ age: schema.number() })]);

  expect(() => type.validate({ age: 'foo' }, {}, 'foo-namespace')).toThrowErrorMatchingSnapshot();
});

test('handles multiple objects with same key', () => {
  const type = schema.oneOf([
    schema.object({ age: schema.string() }),
    schema.object({ age: schema.number() }),
  ]);

  expect(type.validate({ age: 'foo' })).toEqual({ age: 'foo' });
});

test('handles multiple types', () => {
  const type = schema.oneOf([schema.string(), schema.number()]);

  expect(type.validate('test')).toBe('test');
  expect(type.validate(123)).toBe(123);
});

test('handles maybe', () => {
  const type = schema.maybe(schema.oneOf([schema.maybe(schema.string())]));

  expect(type.validate(undefined)).toBe(undefined);
  expect(type.validate('test')).toBe('test');
});

test('fails if not matching type', () => {
  const type = schema.oneOf([schema.string()]);

  expect(() => type.validate(false)).toThrowErrorMatchingSnapshot();
  expect(() => type.validate(123)).toThrowErrorMatchingSnapshot();
});

test('fails if not matching multiple types', () => {
  const type = schema.oneOf([schema.string(), schema.number()]);

  expect(() => type.validate(false)).toThrowErrorMatchingSnapshot();
});

test('fails if not matching literal', () => {
  const type = schema.oneOf([schema.literal('foo')]);

  expect(() => type.validate('bar')).toThrowErrorMatchingSnapshot();
});

test('fails if nested union type fail', () => {
  const type = schema.oneOf([
    schema.oneOf([schema.boolean()]),
    schema.oneOf([schema.oneOf([schema.object({}), schema.number()])]),
  ]);

  expect(() => type.validate('aaa')).toThrowErrorMatchingInlineSnapshot(`
"types that failed validation:
- [0]: types that failed validation:
 - [0]: expected value of type [boolean] but got [string]
- [1]: types that failed validation:
 - [0]: types that failed validation:
  - [0]: expected a plain object value, but found [string] instead.
  - [1]: expected value of type [number] but got [string]"
`);
});
