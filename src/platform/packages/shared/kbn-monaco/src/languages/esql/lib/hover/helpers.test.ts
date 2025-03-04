/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ESQLVariableType } from '@kbn/esql-types';
import { getVariablesHoverContent } from './helpers';

describe('getVariablesHoverContent', () => {
  test('should return empty array if no variables are used in the query', () => {
    const queryString = 'FROM index';
    const offset = 0;
    const variables = [
      {
        key: 'var',
        value: 'value',
        type: ESQLVariableType.VALUES,
      },
    ];

    expect(getVariablesHoverContent(queryString, offset, variables)).toEqual([]);
  });

  test('should return empty array if no variables are given', () => {
    const queryString = 'FROM index';
    const offset = 0;

    expect(getVariablesHoverContent(queryString, offset)).toEqual([]);
  });

  test('should return empty array if there are variables in the query but not on the hovered pipe', () => {
    const queryString = 'FROM index | where var = ?var';
    const offset = 3;

    const variables = [
      {
        key: 'var',
        value: 'value',
        type: ESQLVariableType.VALUES,
      },
    ];

    expect(getVariablesHoverContent(queryString, offset, variables)).toEqual([]);
  });

  test('should return the variable content if the variable is used in the query and on the hovered pipe', () => {
    const queryString = 'FROM logst* | STATS count = COUNT(*) BY ?field';
    const offset = 27;

    const variables = [
      {
        key: 'field',
        value: 'agent',
        type: ESQLVariableType.FIELDS,
      },
    ];

    expect(getVariablesHoverContent(queryString, offset, variables)).toEqual([
      {
        value: '**field**: agent',
      },
    ]);
  });
});
