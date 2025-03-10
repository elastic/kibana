/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { DefaultStringBooleanFalse } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('default_string_boolean_false', () => {
  test('it should validate a boolean false', () => {
    const payload = false;
    const decoded = DefaultStringBooleanFalse.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate a boolean true', () => {
    const payload = true;
    const decoded = DefaultStringBooleanFalse.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate a number', () => {
    const payload = 5;
    const decoded = DefaultStringBooleanFalse.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "DefaultStringBooleanFalse"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default false', () => {
    const payload = null;
    const decoded = DefaultStringBooleanFalse.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(false);
  });

  test('it should return a default false when given a string of "false"', () => {
    const payload = 'false';
    const decoded = DefaultStringBooleanFalse.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(false);
  });

  test('it should return a default true when given a string of "true"', () => {
    const payload = 'true';
    const decoded = DefaultStringBooleanFalse.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(true);
  });

  test('it should return a default true when given a string of "TruE"', () => {
    const payload = 'TruE';
    const decoded = DefaultStringBooleanFalse.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(true);
  });

  test('it should not work with a string of junk "junk"', () => {
    const payload = 'junk';
    const decoded = DefaultStringBooleanFalse.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "junk" supplied to "DefaultStringBooleanFalse"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not work with an empty string', () => {
    const payload = '';
    const decoded = DefaultStringBooleanFalse.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "" supplied to "DefaultStringBooleanFalse"',
    ]);
    expect(message.schema).toEqual({});
  });
});
