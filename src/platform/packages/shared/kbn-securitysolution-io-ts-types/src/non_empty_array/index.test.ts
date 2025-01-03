/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { NonEmptyArray } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

const testSchema = t.keyof({
  valid: true,
  also_valid: true,
});
type TestSchema = t.TypeOf<typeof testSchema>;

const nonEmptyArraySchema = NonEmptyArray(testSchema, 'TestSchemaArray');

describe('non empty array', () => {
  test('it should generate the correct name for non empty array', () => {
    const newTestSchema = NonEmptyArray(testSchema);
    expect(newTestSchema.name).toEqual('NonEmptyArray<"valid" | "also_valid">');
  });

  test('it should use a supplied name override', () => {
    const newTestSchema = NonEmptyArray(testSchema, 'someName');
    expect(newTestSchema.name).toEqual('someName');
  });

  test('it should NOT validate an empty array', () => {
    const payload: string[] = [];
    const decoded = nonEmptyArraySchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "[]" supplied to "TestSchemaArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should validate an array of testSchema', () => {
    const payload: TestSchema[] = ['valid'];
    const decoded = nonEmptyArraySchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of valid testSchema strings', () => {
    const payload: TestSchema[] = ['valid', 'also_valid'];
    const decoded = nonEmptyArraySchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an array with a number', () => {
    const payload = ['valid', 123];
    const decoded = nonEmptyArraySchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "123" supplied to "TestSchemaArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate an array with an invalid string', () => {
    const payload = ['valid', 'invalid'];
    const decoded = nonEmptyArraySchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "invalid" supplied to "TestSchemaArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate a null value', () => {
    const payload = null;
    const decoded = nonEmptyArraySchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "null" supplied to "TestSchemaArray"',
    ]);
    expect(message.schema).toEqual({});
  });
});
