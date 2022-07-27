/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { LimitedSizeArray } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

const testSchema = t.keyof({
  valid: true,
  also_valid: true,
});
type TestSchema = t.TypeOf<typeof testSchema>;

const limitedSizeArraySchema = LimitedSizeArray({
  codec: testSchema,
  minSize: 1,
  maxSize: 2,
  name: 'TestSchemaArray',
});

describe('limited size array', () => {
  test('it should generate the correct name for limited size array', () => {
    const newTestSchema = LimitedSizeArray({ codec: testSchema });
    expect(newTestSchema.name).toEqual('LimitedSizeArray<"valid" | "also_valid">');
  });

  test('it should use a supplied name override', () => {
    const newTestSchema = LimitedSizeArray({ codec: testSchema, name: 'someName' });
    expect(newTestSchema.name).toEqual('someName');
  });

  test('it should not validate an array smaller than min size', () => {
    const payload: string[] = [];
    const decoded = limitedSizeArraySchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Array size (0) is out of bounds: min: 1, max: 2',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should validate an array of testSchema that is within min and max size', () => {
    const payload: TestSchema[] = ['valid'];
    const decoded = limitedSizeArraySchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of valid testSchema strings that is within min and max size', () => {
    const payload: TestSchema[] = ['valid', 'also_valid'];
    const decoded = limitedSizeArraySchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an array bigger than max size', () => {
    const payload: TestSchema[] = ['valid', 'also_valid', 'also_valid'];
    const decoded = limitedSizeArraySchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Array size (3) is out of bounds: min: 1, max: 2',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate an array with a number', () => {
    const payload = ['valid', 123];
    const decoded = limitedSizeArraySchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "123" supplied to "TestSchemaArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate an array with an invalid string', () => {
    const payload = ['valid', 'invalid'];
    const decoded = limitedSizeArraySchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "invalid" supplied to "TestSchemaArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate a null value', () => {
    const payload = null;
    const decoded = limitedSizeArraySchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "null" supplied to "TestSchemaArray"',
    ]);
    expect(message.schema).toEqual({});
  });
});
