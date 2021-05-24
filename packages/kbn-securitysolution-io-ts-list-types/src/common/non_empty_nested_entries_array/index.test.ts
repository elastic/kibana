/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { EntriesArray } from '../entries';
import { nonEmptyNestedEntriesArray } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { getEntryMatchMock } from '../entry_match/index.mock';
import { getEntryMatchAnyMock } from '../entry_match_any/index.mock';
import { getEntryExistsMock } from '../entries_exist/index.mock';
import { getEntryNestedMock } from '../entry_nested/index.mock';

describe('non_empty_nested_entries_array', () => {
  test('it should FAIL validation when given an empty array', () => {
    const payload: EntriesArray = [];
    const decoded = nonEmptyNestedEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "[]" supplied to "NonEmptyNestedEntriesArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when given "undefined"', () => {
    const payload = undefined;
    const decoded = nonEmptyNestedEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "NonEmptyNestedEntriesArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when given "null"', () => {
    const payload = null;
    const decoded = nonEmptyNestedEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "null" supplied to "NonEmptyNestedEntriesArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should validate an array of "match" entries', () => {
    const payload: EntriesArray = [getEntryMatchMock(), getEntryMatchMock()];
    const decoded = nonEmptyNestedEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of "match_any" entries', () => {
    const payload: EntriesArray = [getEntryMatchAnyMock(), getEntryMatchAnyMock()];
    const decoded = nonEmptyNestedEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of "exists" entries', () => {
    const payload: EntriesArray = [getEntryExistsMock(), getEntryExistsMock()];
    const decoded = nonEmptyNestedEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should FAIL validation when given an array of "nested" entries', () => {
    const payload: EntriesArray = [getEntryNestedMock(), getEntryNestedMock()];
    const decoded = nonEmptyNestedEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "operator"',
      'Invalid value "nested" supplied to "type"',
      'Invalid value "undefined" supplied to "value"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should validate an array of entries', () => {
    const payload: EntriesArray = [
      getEntryExistsMock(),
      getEntryMatchAnyMock(),
      getEntryMatchMock(),
    ];
    const decoded = nonEmptyNestedEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should FAIL validation when given an array of non entries', () => {
    const payload = [1];
    const decoded = nonEmptyNestedEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "1" supplied to "NonEmptyNestedEntriesArray"',
    ]);
    expect(message.schema).toEqual({});
  });
});
