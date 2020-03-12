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

test('returns value by default', () => {
  expect(schema.boolean().validate(true)).toBe(true);
});

test('handles boolean strings', () => {
  expect(schema.boolean().validate('true')).toBe(true);
  expect(schema.boolean().validate('TRUE')).toBe(true);
  expect(schema.boolean().validate('True')).toBe(true);
  expect(schema.boolean().validate('TrUe')).toBe(true);
  expect(schema.boolean().validate('false')).toBe(false);
  expect(schema.boolean().validate('FALSE')).toBe(false);
  expect(schema.boolean().validate('False')).toBe(false);
  expect(schema.boolean().validate('FaLse')).toBe(false);
});

test('is required by default', () => {
  expect(() => schema.boolean().validate(undefined)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [boolean] but got [undefined]"`
  );
});

test('includes namespace in failure', () => {
  expect(() =>
    schema.boolean().validate(undefined, {}, 'foo-namespace')
  ).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace]: expected value of type [boolean] but got [undefined]"`
  );
});

describe('#defaultValue', () => {
  test('returns default when undefined', () => {
    expect(schema.boolean({ defaultValue: true }).validate(undefined)).toBe(true);
  });

  test('returns value when specified', () => {
    expect(schema.boolean({ defaultValue: true }).validate(false)).toBe(false);
  });
});

test('returns error when not boolean', () => {
  expect(() => schema.boolean().validate(123)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [boolean] but got [number]"`
  );

  expect(() => schema.boolean().validate([1, 2, 3])).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [boolean] but got [Array]"`
  );

  expect(() => schema.boolean().validate('abc')).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [boolean] but got [string]"`
  );

  expect(() => schema.boolean().validate(0)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [boolean] but got [number]"`
  );

  expect(() => schema.boolean().validate('no')).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [boolean] but got [string]"`
  );
});
