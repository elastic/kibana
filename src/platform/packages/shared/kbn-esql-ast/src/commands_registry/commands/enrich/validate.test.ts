/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext } from '../../../definitions/utils/test_mocks';
import { validate } from './validate';

import { expectErrors } from '../../../definitions/utils/test_functions';
import { camelCase } from 'lodash';

const enrichExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'enrich', validate);
};

describe('ENRICH Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates the most basic query', () => {
    enrichExpectErrors(`from a_index | enrich policy `, []);
    enrichExpectErrors(`from a_index | enrich policy on textField with var0 = doubleField `, []);
    enrichExpectErrors(
      `from a_index | enrich policy on textField with var0 = doubleField, textField `,
      []
    );
    enrichExpectErrors(
      `from a_index | enrich policy on textField with col0 = doubleField, var0 = textField`,
      []
    );
    enrichExpectErrors(`from a_index | enrich policy with doubleField`, []);
    enrichExpectErrors(`from a_index | enrich policy | eval doubleField`, []);
    enrichExpectErrors(`from a_index | enrich policy with col0 = doubleField | eval col0`, []);
  });
  test('validates the coordinators', () => {
    for (const value of ['any', 'coordinator', 'remote']) {
      enrichExpectErrors(`from a_index | enrich _${value}:policy `, []);
      enrichExpectErrors(`from a_index | enrich _${value} :  policy `, [
        `Unknown policy [_${value}]`,
      ]);
      enrichExpectErrors(`from a_index | enrich _${value}:  policy `, [
        `Unknown policy [_${value}]`,
      ]);
      enrichExpectErrors(`from a_index | enrich _${camelCase(value)}:policy `, []);
      enrichExpectErrors(`from a_index | enrich _${value.toUpperCase()}:policy `, []);
    }

    enrichExpectErrors(`from a_index | enrich _unknown:policy`, [
      'Unrecognized value [_unknown] for ENRICH, mode needs to be one of [_any, _coordinator, _remote]',
    ]);
    enrichExpectErrors(`from a_index | enrich any:policy`, [
      'Unrecognized value [any] for ENRICH, mode needs to be one of [_any, _coordinator, _remote]',
    ]);
  });
  test('raises error on unknown policy', () => {
    enrichExpectErrors(`from a_index | enrich _`, ['Unknown policy [_]']);
    enrichExpectErrors(`from a_index | enrich _:`, ['Unknown policy [_]']);
    enrichExpectErrors(`from a_index | enrich any:`, ['Unknown policy [any]']);
    enrichExpectErrors(`from a_index | enrich _:policy`, [
      'Unrecognized value [_] for ENRICH, mode needs to be one of [_any, _coordinator, _remote]',
    ]);
    enrichExpectErrors(`from a_index | enrich _any:`, ['Unknown policy [_any]']);
    enrichExpectErrors('from a_index | enrich `this``is fine`', ['Unknown policy [`this``is]']);
    enrichExpectErrors('from a_index | enrich this is fine', ['Unknown policy [this]']);
    enrichExpectErrors(`from a_index |enrich missing-policy `, ['Unknown policy [missing-policy]']);
    enrichExpectErrors('from a_index | enrich my-pol*', [
      'Using wildcards (*) in ENRICH is not allowed [my-pol*]',
    ]);
  });

  test('validates the columns', () => {
    enrichExpectErrors(`from a_index | enrich policy on b `, ['Unknown column [b]']);

    enrichExpectErrors('from a_index | enrich policy on `this``is fine`', [
      'Unknown column [this`is fine]',
    ]);
    enrichExpectErrors('from a_index | enrich policy on this is fine', ['Unknown column [this]']);
    enrichExpectErrors(`from a_index | enrich policy on textField with col1 `, [
      'Unknown column [col1]',
    ]);
    enrichExpectErrors(`from a_index |enrich policy on doubleField with col1 = `, [
      'Unknown column [col1]',
    ]);
    enrichExpectErrors(`from a_index | enrich policy on textField with col1 = c `, [
      'Unknown column [col1]',
      `Unknown column [c]`,
    ]);
    enrichExpectErrors(`from a_index |enrich policy on doubleField with col1 = , `, [
      'Unknown column [col1]',
    ]);
    enrichExpectErrors(`from a_index | enrich policy on textField with var0 = doubleField, col1 `, [
      'Unknown column [col1]',
    ]);
    enrichExpectErrors(
      `from a_index |enrich policy on doubleField with col0 = doubleField, col1 = `,
      ['Unknown column [col1]']
    );
  });
});
