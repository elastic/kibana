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
  expect(schema.number().validate(4)).toBe(4);
});

test('handles numeric strings with ints', () => {
  expect(schema.number().validate('4')).toBe(4);
});

test('handles numeric strings with floats', () => {
  expect(schema.number().validate('4.23')).toBe(4.23);
});

test('fails if number is `NaN`', () => {
  expect(() => schema.number().validate(NaN)).toThrowErrorMatchingSnapshot();
});

test('is required by default', () => {
  expect(() => schema.number().validate(undefined)).toThrowErrorMatchingSnapshot();
});

test('includes namespace in failure', () => {
  expect(() =>
    schema.number().validate(undefined, {}, 'foo-namespace')
  ).toThrowErrorMatchingSnapshot();
});

describe('#min', () => {
  test('returns value when larger number', () => {
    expect(schema.number({ min: 2 }).validate(3)).toBe(3);
  });

  test('returns error when smaller number', () => {
    expect(() => schema.number({ min: 4 }).validate(3)).toThrowErrorMatchingSnapshot();
  });
});

describe('#max', () => {
  test('returns value when smaller number', () => {
    expect(schema.number({ max: 4 }).validate(3)).toBe(3);
  });

  test('returns error when larger number', () => {
    expect(() => schema.number({ max: 2 }).validate(3)).toThrowErrorMatchingSnapshot();
  });
});

describe('#defaultValue', () => {
  test('returns default when number is undefined', () => {
    expect(schema.number({ defaultValue: 2 }).validate(undefined)).toBe(2);
  });

  test('returns value when specified', () => {
    expect(schema.number({ defaultValue: 2 }).validate(3)).toBe(3);
  });
});

test('returns error when not number or numeric string', () => {
  expect(() => schema.number().validate('test')).toThrowErrorMatchingSnapshot();

  expect(() => schema.number().validate([1, 2, 3])).toThrowErrorMatchingSnapshot();

  expect(() => schema.number().validate(/abc/)).toThrowErrorMatchingSnapshot();
});
