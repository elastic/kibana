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
import { getEntryMatchMock } from './index.mock';
import { entriesMatch, EntryMatch } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('entriesMatch', () => {
  test('it should validate an entry', () => {
    const payload = getEntryMatchMock();
    const decoded = entriesMatch.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate when operator is "included"', () => {
    const payload = getEntryMatchMock();
    const decoded = entriesMatch.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate when "operator" is "excluded"', () => {
    const payload = getEntryMatchMock();
    payload.operator = 'excluded';
    const decoded = entriesMatch.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should FAIL validation when "field" is empty string', () => {
    const payload: Omit<EntryMatch, 'field'> & { field: string } = {
      ...getEntryMatchMock(),
      field: '',
    };
    const decoded = entriesMatch.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "field"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "value" is not string', () => {
    const payload: Omit<EntryMatch, 'value'> & { value: string[] } = {
      ...getEntryMatchMock(),
      value: ['some value'],
    };
    const decoded = entriesMatch.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "["some value"]" supplied to "value"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "value" is empty string', () => {
    const payload: Omit<EntryMatch, 'value'> & { value: string } = {
      ...getEntryMatchMock(),
      value: '',
    };
    const decoded = entriesMatch.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "value"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "type" is not "match"', () => {
    const payload: Omit<EntryMatch, 'type'> & { type: string } = {
      ...getEntryMatchMock(),
      type: 'match_any',
    };
    const decoded = entriesMatch.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "match_any" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should strip out extra keys', () => {
    const payload: EntryMatch & {
      extraKey?: string;
    } = getEntryMatchMock();
    payload.extraKey = 'some value';
    const decoded = entriesMatch.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getEntryMatchMock());
  });
});
