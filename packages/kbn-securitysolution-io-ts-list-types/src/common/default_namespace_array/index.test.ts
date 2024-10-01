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
import { DefaultNamespaceArray, DefaultNamespaceArrayType } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('default_namespace_array', () => {
  test('it should validate "null" single item as an array with a "single" value', () => {
    const payload: DefaultNamespaceArrayType = null;
    const decoded = DefaultNamespaceArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(['single']);
  });

  test('it should FAIL validation of numeric value', () => {
    const payload = 5;
    const decoded = DefaultNamespaceArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "DefaultNamespaceArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should validate "undefined" item as an array with a "single" value', () => {
    const payload: DefaultNamespaceArrayType = undefined;
    const decoded = DefaultNamespaceArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(['single']);
  });

  test('it should validate "single" as an array of a "single" value', () => {
    const payload: DefaultNamespaceArrayType = 'single';
    const decoded = DefaultNamespaceArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([payload]);
  });

  test('it should validate "agnostic" as an array of a "agnostic" value', () => {
    const payload: DefaultNamespaceArrayType = 'agnostic';
    const decoded = DefaultNamespaceArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([payload]);
  });

  test('it should validate "single,agnostic" as an array of 2 values of ["single", "agnostic"] values', () => {
    const payload: DefaultNamespaceArrayType = 'agnostic,single';
    const decoded = DefaultNamespaceArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(['agnostic', 'single']);
  });

  test('it should validate 3 elements of "single,agnostic,single" as an array of 3 values of ["single", "agnostic", "single"] values', () => {
    const payload: DefaultNamespaceArrayType = 'single,agnostic,single';
    const decoded = DefaultNamespaceArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(['single', 'agnostic', 'single']);
  });

  test('it should validate 3 elements of "single,agnostic, single" as an array of 3 values of ["single", "agnostic", "single"] values when there are spaces', () => {
    const payload: DefaultNamespaceArrayType = '  single,  agnostic, single  ';
    const decoded = DefaultNamespaceArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(['single', 'agnostic', 'single']);
  });

  test('it should FAIL validation when given 3 elements of "single,agnostic,junk" since the 3rd value is junk', () => {
    const payload: DefaultNamespaceArrayType = 'single,agnostic,junk';
    const decoded = DefaultNamespaceArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "junk" supplied to "DefaultNamespaceArray"',
    ]);
    expect(message.schema).toEqual({});
  });
});
