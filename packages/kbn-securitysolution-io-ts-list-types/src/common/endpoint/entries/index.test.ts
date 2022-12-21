/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { getEndpointEntryMatchMock } from '../entry_match/index.mock';
import {
  endpointEntriesArray,
  nonEmptyEndpointEntriesArray,
  NonEmptyEndpointEntriesArray,
} from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { getEndpointEntryMatchAnyMock } from '../entry_match_any/index.mock';
import { getEndpointEntryNestedMock } from '../entry_nested/index.mock';
import { getEndpointEntriesArrayMock } from './index.mock';
import { getEntryListMock } from '../../entries_list/index.mock';
import { getEntryExistsMock } from '../../entries_exist/index.mock';
import { getEndpointEntryMatchWildcardMock } from '../entry_match_wildcard/index.mock';

describe('Endpoint', () => {
  describe('entriesArray', () => {
    test('it should validate an array with match entry', () => {
      const payload = [getEndpointEntryMatchMock()];
      const decoded = endpointEntriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate an array with match_any entry', () => {
      const payload = [getEndpointEntryMatchAnyMock()];
      const decoded = endpointEntriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should NOT validate an empty array', () => {
      const payload: NonEmptyEndpointEntriesArray = [];
      const decoded = nonEmptyEndpointEntriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "[]" supplied to "NonEmptyEndpointEntriesArray"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('type guard for nonEmptyEndpointNestedEntries should allow array of endpoint entries', () => {
      const payload: NonEmptyEndpointEntriesArray = [getEndpointEntryMatchAnyMock()];
      const guarded = nonEmptyEndpointEntriesArray.is(payload);
      expect(guarded).toBeTruthy();
    });

    test('type guard for nonEmptyEndpointNestedEntries should disallow empty arrays', () => {
      const payload: NonEmptyEndpointEntriesArray = [];
      const guarded = nonEmptyEndpointEntriesArray.is(payload);
      expect(guarded).toBeFalsy();
    });

    test('it should NOT validate an array with exists entry', () => {
      const payload = [getEntryExistsMock()];
      const decoded = endpointEntriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "exists" supplied to "type"',
        'Invalid value "undefined" supplied to "value"',
        'Invalid value "undefined" supplied to "entries"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate an array with list entry', () => {
      const payload = [getEntryListMock()];
      const decoded = endpointEntriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "list" supplied to "type"',
        'Invalid value "undefined" supplied to "value"',
        'Invalid value "undefined" supplied to "entries"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should validate an array with nested entry', () => {
      const payload = [getEndpointEntryNestedMock()];
      const decoded = endpointEntriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate an array with wildcard entry', () => {
      const payload = [getEndpointEntryMatchWildcardMock()];
      const decoded = endpointEntriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate an array with all types of entries', () => {
      const payload = getEndpointEntriesArrayMock();
      const decoded = endpointEntriesArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });
  });
});
