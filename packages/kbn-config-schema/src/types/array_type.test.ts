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

test('returns value if it matches the type', () => {
  const type = schema.arrayOf(schema.string());
  expect(type.validate(['foo', 'bar', 'baz'])).toEqual(['foo', 'bar', 'baz']);
});

test('fails if wrong input type', () => {
  const type = schema.arrayOf(schema.string());
  expect(() => type.validate('test')).toThrowErrorMatchingSnapshot();
});

test('includes namespace in failure when wrong top-level type', () => {
  const type = schema.arrayOf(schema.string());
  expect(() => type.validate('test', {}, 'foo-namespace')).toThrowErrorMatchingSnapshot();
});

test('includes namespace in failure when wrong item type', () => {
  const type = schema.arrayOf(schema.string());
  expect(() => type.validate([123], {}, 'foo-namespace')).toThrowErrorMatchingSnapshot();
});

test('fails if wrong type of content in array', () => {
  const type = schema.arrayOf(schema.string());
  expect(() => type.validate([1, 2, 3])).toThrowErrorMatchingSnapshot();
});

test('fails if mixed types of content in array', () => {
  const type = schema.arrayOf(schema.string());
  expect(() => type.validate(['foo', 'bar', true, {}])).toThrowErrorMatchingSnapshot();
});

test('returns empty array if input is empty but type has default value', () => {
  const type = schema.arrayOf(schema.string({ defaultValue: 'test' }));
  expect(type.validate([])).toEqual([]);
});

test('returns empty array if input is empty even if type is required', () => {
  const type = schema.arrayOf(schema.string());
  expect(type.validate([])).toEqual([]);
});

test('fails for null values if optional', () => {
  const type = schema.arrayOf(schema.maybe(schema.string()));
  expect(() => type.validate([null])).toThrowErrorMatchingSnapshot();
});

test('handles default values for undefined values', () => {
  const type = schema.arrayOf(schema.string({ defaultValue: 'foo' }));
  expect(type.validate([undefined])).toEqual(['foo']);
});

test('array within array', () => {
  const type = schema.arrayOf(
    schema.arrayOf(schema.string(), {
      maxSize: 2,
      minSize: 2,
    }),
    { minSize: 1, maxSize: 1 }
  );

  const value = [['foo', 'bar']];

  expect(type.validate(value)).toEqual([['foo', 'bar']]);
});

test('object within array', () => {
  const type = schema.arrayOf(
    schema.object({
      foo: schema.string({ defaultValue: 'foo' }),
    })
  );

  const value = [
    {
      foo: 'test',
    },
  ];

  expect(type.validate(value)).toEqual([{ foo: 'test' }]);
});

test('object within array with required', () => {
  const type = schema.arrayOf(
    schema.object({
      foo: schema.string(),
    })
  );

  const value = [{}];

  expect(() => type.validate(value)).toThrowErrorMatchingSnapshot();
});

describe('#minSize', () => {
  test('returns value when more items', () => {
    expect(schema.arrayOf(schema.string(), { minSize: 1 }).validate(['foo'])).toEqual(['foo']);
  });

  test('returns error when fewer items', () => {
    expect(() =>
      schema.arrayOf(schema.string(), { minSize: 2 }).validate(['foo'])
    ).toThrowErrorMatchingSnapshot();
  });
});

describe('#maxSize', () => {
  test('returns value when fewer items', () => {
    expect(schema.arrayOf(schema.string(), { maxSize: 2 }).validate(['foo'])).toEqual(['foo']);
  });

  test('returns error when more items', () => {
    expect(() =>
      schema.arrayOf(schema.string(), { maxSize: 1 }).validate(['foo', 'bar'])
    ).toThrowErrorMatchingSnapshot();
  });
});
