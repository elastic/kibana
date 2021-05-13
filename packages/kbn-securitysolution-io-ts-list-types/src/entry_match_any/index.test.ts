/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { getEntryMatchAnyMock } from './index.mock';
import { entriesMatchAny, EntryMatchAny } from '.';
import { foldLeftRight, getPaths } from '../../test_utils';

describe('entriesMatchAny', () => {
  test('it should validate an entry', () => {
    const payload = getEntryMatchAnyMock();
    const decoded = entriesMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate when operator is "included"', () => {
    const payload = getEntryMatchAnyMock();
    const decoded = entriesMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate when operator is "excluded"', () => {
    const payload = getEntryMatchAnyMock();
    payload.operator = 'excluded';
    const decoded = entriesMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should FAIL validation when field is empty string', () => {
    const payload: Omit<EntryMatchAny, 'field'> & { field: string } = {
      ...getEntryMatchAnyMock(),
      field: '',
    };
    const decoded = entriesMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "field"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when value is empty array', () => {
    const payload: Omit<EntryMatchAny, 'value'> & { value: string[] } = {
      ...getEntryMatchAnyMock(),
      value: [],
    };
    const decoded = entriesMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "[]" supplied to "value"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when value is not string array', () => {
    const payload: Omit<EntryMatchAny, 'value'> & { value: string } = {
      ...getEntryMatchAnyMock(),
      value: 'some string',
    };
    const decoded = entriesMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some string" supplied to "value"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "type" is not "match_any"', () => {
    const payload: Omit<EntryMatchAny, 'type'> & { type: string } = {
      ...getEntryMatchAnyMock(),
      type: 'match',
    };
    const decoded = entriesMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "match" supplied to "type"']);
    expect(message.schema).toEqual({});
  });

  test('it should strip out extra keys', () => {
    const payload: EntryMatchAny & {
      extraKey?: string;
    } = getEntryMatchAnyMock();
    payload.extraKey = 'some extra key';
    const decoded = entriesMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getEntryMatchAnyMock());
  });
});
