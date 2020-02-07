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
import { Stream, Readable, Writable, PassThrough } from 'stream';

test('returns value by default', () => {
  const value = new Stream();
  expect(schema.stream().validate(value)).toStrictEqual(value);
});

test('Readable is valid', () => {
  const value = new Readable();
  expect(schema.stream().validate(value)).toStrictEqual(value);
});

test('Writable is valid', () => {
  const value = new Writable();
  expect(schema.stream().validate(value)).toStrictEqual(value);
});

test('Passthrough is valid', () => {
  const value = new PassThrough();
  expect(schema.stream().validate(value)).toStrictEqual(value);
});

test('is required by default', () => {
  expect(() => schema.buffer().validate(undefined)).toThrowErrorMatchingSnapshot();
});

test('includes namespace in failure', () => {
  expect(() =>
    schema.stream().validate(undefined, {}, 'foo-namespace')
  ).toThrowErrorMatchingSnapshot();
});

describe('#defaultValue', () => {
  test('returns default when undefined', () => {
    const value = new Stream();
    expect(schema.stream({ defaultValue: value }).validate(undefined)).toStrictEqual(value);
  });

  test('returns value when specified', () => {
    const value = new Stream();
    expect(schema.stream({ defaultValue: new PassThrough() }).validate(value)).toStrictEqual(value);
  });
});

test('returns error when not a stream', () => {
  expect(() => schema.stream().validate(123)).toThrowErrorMatchingSnapshot();

  expect(() => schema.stream().validate([1, 2, 3])).toThrowErrorMatchingSnapshot();

  expect(() => schema.stream().validate('abc')).toThrowErrorMatchingSnapshot();
});
