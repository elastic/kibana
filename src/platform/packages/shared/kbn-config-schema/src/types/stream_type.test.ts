/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '../..';
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
  expect(() => schema.buffer().validate(undefined)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [Buffer] but got [undefined]"`
  );
});

test('includes namespace in failure', () => {
  expect(() =>
    schema.stream().validate(undefined, {}, 'foo-namespace')
  ).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace]: expected value of type [Stream] but got [undefined]"`
  );
});

describe('#defaultValue', () => {
  test('returns default when undefined', () => {
    const value = new Stream();
    expect(schema.stream({ defaultValue: value }).validate(undefined)).toBeInstanceOf(Stream);
  });

  test('returns value when specified', () => {
    const value = new Stream();
    expect(schema.stream({ defaultValue: new PassThrough() }).validate(value)).toStrictEqual(value);
  });
});

test('returns error when not a stream', () => {
  expect(() => schema.stream().validate(123)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [Stream] but got [number]"`
  );

  expect(() => schema.stream().validate([1, 2, 3])).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [Stream] but got [Array]"`
  );

  expect(() => schema.stream().validate('abc')).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [Stream] but got [string]"`
  );
});
