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
import { getEntryMatchMock } from '../entry_match/index.mock';
import { entriesArray, entriesArrayOrUndefined, entry } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { getEntryMatchAnyMock } from '../entry_match_any/index.mock';
import { getEntryExistsMock } from '../entries_exist/index.mock';
import { getEntryListMock } from '../entries_list/index.mock';
import { getEntryNestedMock } from '../entry_nested/index.mock';
import { getEntriesArrayMock } from './index.mock';

describe('Entries', () => {
  describe('entry', () => {
    test('it should validate a match entry', () => {
      const payload = getEntryMatchMock();
      const decoded = entry.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate a match_any entry', () => {
      const payload = getEntryMatchAnyMock();
      const decoded = entry.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate a exists entry', () => {
      const payload = getEntryExistsMock();
      const decoded = entry.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate a list entry', () => {
      const payload = getEntryListMock();
      const decoded = entry.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should FAIL validation of nested entry', () => {
      const payload = getEntryNestedMock();
      const decoded = entry.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "operator"',
        'Invalid value "nested" supplied to "type"',
        'Invalid value "undefined" supplied to "value"',
        'Invalid value "undefined" supplied to "list"',
      ]);
      expect(message.schema).toEqual({});
    });
  });

  describe('entriesArray', () => {
    test('it should validate an array with match entry', () => {
      const payload = [getEntryMatchMock()];
      const decoded = entriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate an array with match_any entry', () => {
      const payload = [getEntryMatchAnyMock()];
      const decoded = entriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate an array with exists entry', () => {
      const payload = [getEntryExistsMock()];
      const decoded = entriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate an array with list entry', () => {
      const payload = [getEntryListMock()];
      const decoded = entriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate an array with nested entry', () => {
      const payload = [getEntryNestedMock()];
      const decoded = entriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate an array with all types of entries', () => {
      const payload = [...getEntriesArrayMock()];
      const decoded = entriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });
  });

  describe('entriesArrayOrUndefined', () => {
    test('it should validate undefined', () => {
      const payload = undefined;
      const decoded = entriesArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate an array with nested entry', () => {
      const payload = [getEntryNestedMock()];
      const decoded = entriesArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });
  });
});
