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
import { EndpointEntryNested, endpointEntryNested } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { getEndpointEntryNestedMock } from './index.mock';
import { getEndpointEntryMatchAnyMock } from '../entry_match_any/index.mock';
import {
  nonEmptyEndpointNestedEntriesArray,
  NonEmptyEndpointNestedEntriesArray,
} from '../non_empty_nested_entries_array';
import { getEndpointEntryMatchMock } from '../entry_match/index.mock';
import { getEntryExistsMock } from '../../entries_exist/index.mock';

describe('endpointEntryNested', () => {
  test('it should validate a nested entry', () => {
    const payload = getEndpointEntryNestedMock();
    const decoded = endpointEntryNested.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should FAIL validation when "type" is not "nested"', () => {
    const payload: Omit<EndpointEntryNested, 'type'> & { type: 'match' } = {
      ...getEndpointEntryNestedMock(),
      type: 'match',
    };
    const decoded = endpointEntryNested.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "match" supplied to "type"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "field" is empty string', () => {
    const payload: Omit<EndpointEntryNested, 'field'> & {
      field: string;
    } = { ...getEndpointEntryNestedMock(), field: '' };
    const decoded = endpointEntryNested.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "field"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "field" is not a string', () => {
    const payload: Omit<EndpointEntryNested, 'field'> & {
      field: number;
    } = { ...getEndpointEntryNestedMock(), field: 1 };
    const decoded = endpointEntryNested.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "1" supplied to "field"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "entries" is not an array', () => {
    const payload: Omit<EndpointEntryNested, 'entries'> & {
      entries: string;
    } = { ...getEndpointEntryNestedMock(), entries: 'im a string' };
    const decoded = endpointEntryNested.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "im a string" supplied to "entries"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should validate when "entries" contains an entry item that is type "match"', () => {
    const payload = { ...getEndpointEntryNestedMock(), entries: [getEndpointEntryMatchAnyMock()] };
    const decoded = endpointEntryNested.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual({
      entries: [
        {
          field: 'host.name',
          operator: 'included',
          type: 'match_any',
          value: ['some host name'],
        },
      ],
      field: 'host.name',
      type: 'nested',
    });
  });

  test('it should NOT validate when "entries" contains an entry item that is type "exists"', () => {
    const payload = { ...getEndpointEntryNestedMock(), entries: [getEntryExistsMock()] };
    const decoded = endpointEntryNested.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "exists" supplied to "entries,type"',
      'Invalid value "undefined" supplied to "entries,value"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should strip out extra keys', () => {
    const payload: EndpointEntryNested & {
      extraKey?: string;
    } = getEndpointEntryNestedMock();
    payload.extraKey = 'some extra key';
    const decoded = endpointEntryNested.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getEndpointEntryNestedMock());
  });

  test('type guard for nonEmptyEndpointNestedEntries should allow array of endpoint entries', () => {
    const payload: NonEmptyEndpointNestedEntriesArray = [
      getEndpointEntryMatchMock(),
      getEndpointEntryMatchAnyMock(),
    ];
    const guarded = nonEmptyEndpointNestedEntriesArray.is(payload);
    expect(guarded).toBeTruthy();
  });

  test('type guard for nonEmptyEndpointNestedEntries should disallow empty arrays', () => {
    const payload: NonEmptyEndpointNestedEntriesArray = [];
    const guarded = nonEmptyEndpointNestedEntriesArray.is(payload);
    expect(guarded).toBeFalsy();
  });
});
