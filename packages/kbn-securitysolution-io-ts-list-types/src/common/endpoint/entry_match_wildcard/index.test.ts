/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { getEndpointEntryMatchWildcardMock } from './index.mock';
import { EndpointEntryMatchWildcard, endpointEntryMatchWildcard } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { getEntryMatchWildcardMock } from '../../entry_match_wildcard/index.mock';

describe('endpointEntryMatchWildcard', () => {
  test('it should validate an entry', () => {
    const payload = getEndpointEntryMatchWildcardMock();
    const decoded = endpointEntryMatchWildcard.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT validate when "operator" is "excluded"', () => {
    const payload = getEntryMatchWildcardMock();
    payload.operator = 'excluded';
    const decoded = endpointEntryMatchWildcard.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "excluded" supplied to "operator"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "field" is empty string', () => {
    const payload: Omit<EndpointEntryMatchWildcard, 'field'> & { field: string } = {
      ...getEndpointEntryMatchWildcardMock(),
      field: '',
    };
    const decoded = endpointEntryMatchWildcard.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "field"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "value" is not string', () => {
    const payload: Omit<EndpointEntryMatchWildcard, 'value'> & { value: string[] } = {
      ...getEndpointEntryMatchWildcardMock(),
      value: ['some value'],
    };
    const decoded = endpointEntryMatchWildcard.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "["some value"]" supplied to "value"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "value" is empty string', () => {
    const payload: Omit<EndpointEntryMatchWildcard, 'value'> & { value: string } = {
      ...getEndpointEntryMatchWildcardMock(),
      value: '',
    };
    const decoded = endpointEntryMatchWildcard.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "value"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "type" is not "wildcard"', () => {
    const payload: Omit<EndpointEntryMatchWildcard, 'type'> & { type: string } = {
      ...getEndpointEntryMatchWildcardMock(),
      type: 'match',
    };
    const decoded = endpointEntryMatchWildcard.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "match" supplied to "type"']);
    expect(message.schema).toEqual({});
  });

  test('it should strip out extra keys', () => {
    const payload: EndpointEntryMatchWildcard & {
      extraKey?: string;
    } = getEndpointEntryMatchWildcardMock();
    payload.extraKey = 'some value';
    const decoded = endpointEntryMatchWildcard.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getEntryMatchWildcardMock());
  });
});
