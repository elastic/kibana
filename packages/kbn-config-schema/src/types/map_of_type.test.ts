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

test('handles object as input', () => {
  const type = schema.mapOf(schema.string(), schema.string());
  const value = {
    name: 'foo',
  };
  const expected = new Map([['name', 'foo']]);

  expect(type.validate(value)).toEqual(expected);
});

test('properly parse the value if input is a string', () => {
  const type = schema.mapOf(schema.string(), schema.string());
  const value = `{"name": "foo"}`;
  const expected = new Map([['name', 'foo']]);

  expect(type.validate(value)).toEqual(expected);
});

test('fails if string input cannot be parsed', () => {
  const type = schema.mapOf(schema.string(), schema.string());
  expect(() => type.validate(`invalidjson`)).toThrowErrorMatchingInlineSnapshot(
    `"could not parse map value from [invalidjson]"`
  );
});

test('fails with correct type if parsed input is not an object', () => {
  const type = schema.mapOf(schema.string(), schema.string());
  expect(() => type.validate('[1,2,3]')).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [Map] or [object] but got [Array]"`
  );
});

test('fails when not receiving expected value type', () => {
  const type = schema.mapOf(schema.string(), schema.string());
  const value = {
    name: 123,
  };

  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(
    `"[name]: expected value of type [string] but got [number]"`
  );
});

test('fails after parsing when not receiving expected value type', () => {
  const type = schema.mapOf(schema.string(), schema.string());
  const value = `{"name": 123}`;

  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(
    `"[name]: expected value of type [string] but got [number]"`
  );
});

test('fails when not receiving expected key type', () => {
  const type = schema.mapOf(schema.number(), schema.string());
  const value = {
    name: 'foo',
  };

  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(
    `"[key(\\"name\\")]: expected value of type [number] but got [string]"`
  );
});

test('fails after parsing when not receiving expected key type', () => {
  const type = schema.mapOf(schema.number(), schema.string());
  const value = `{"name": "foo"}`;

  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(
    `"[key(\\"name\\")]: expected value of type [number] but got [string]"`
  );
});

test('includes namespace in failure when wrong top-level type', () => {
  const type = schema.mapOf(schema.string(), schema.string());
  expect(() => type.validate([], {}, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace]: expected value of type [Map] or [object] but got [Array]"`
  );
});

test('includes namespace in failure when wrong value type', () => {
  const type = schema.mapOf(schema.string(), schema.string());
  const value = {
    name: 123,
  };

  expect(() => type.validate(value, {}, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace.name]: expected value of type [string] but got [number]"`
  );
});

test('includes namespace in failure when wrong key type', () => {
  const type = schema.mapOf(schema.number(), schema.string());
  const value = {
    name: 'foo',
  };

  expect(() => type.validate(value, {}, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace.key(\\"name\\")]: expected value of type [number] but got [string]"`
  );
});

test('returns default value if undefined', () => {
  const obj = new Map([['foo', 'bar']]);

  const type = schema.mapOf(schema.string(), schema.string(), {
    defaultValue: obj,
  });

  expect(type.validate(undefined)).toEqual(obj);
});

test('mapOf within mapOf', () => {
  const type = schema.mapOf(schema.string(), schema.mapOf(schema.string(), schema.number()));
  const value = {
    foo: {
      bar: 123,
    },
  };
  const expected = new Map([['foo', new Map([['bar', 123]])]]);

  expect(type.validate(value)).toEqual(expected);
});

test('object within mapOf', () => {
  const type = schema.mapOf(
    schema.string(),
    schema.object({
      bar: schema.number(),
    })
  );
  const value = {
    foo: {
      bar: 123,
    },
  };
  const expected = new Map([['foo', { bar: 123 }]]);

  expect(type.validate(value)).toEqual(expected);
});

test('error preserves full path', () => {
  const type = schema.object({
    grandParentKey: schema.object({
      parentKey: schema.mapOf(schema.string({ minLength: 2 }), schema.number()),
    }),
  });

  expect(() =>
    type.validate({ grandParentKey: { parentKey: { a: 'some-value' } } })
  ).toThrowErrorMatchingInlineSnapshot(
    `"[grandParentKey.parentKey.key(\\"a\\")]: value is [a] but it must have a minimum length of [2]."`
  );

  expect(() =>
    type.validate({ grandParentKey: { parentKey: { ab: 'some-value' } } })
  ).toThrowErrorMatchingInlineSnapshot(
    `"[grandParentKey.parentKey.ab]: expected value of type [number] but got [string]"`
  );
});
