/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { WalkerAstNode } from '@kbn/esql-ast';
import { ESQLVariableType } from '@kbn/esql-types';
import { getVariablesHoverContent, correctQuerySyntax } from './helpers';

describe('getVariablesHoverContent', () => {
  test('should return empty array if no variables are used in the query', async () => {
    const node = {
      type: 'source',
      prefix: undefined,
      index: {
        valueUnquoted: 'logst*',
      },
      name: 'logst*',
      sourceType: 'index',
      location: {
        min: 5,
        max: 10,
      },
      incomplete: false,
      text: 'logst*',
    } as WalkerAstNode;

    const variables = [
      {
        key: 'var',
        value: 'value',
        type: ESQLVariableType.VALUES,
      },
    ];

    expect(getVariablesHoverContent(node, variables)).toEqual([]);
  });

  test('should return empty array if no variables are given', () => {
    const node = {
      type: 'source',
      prefix: undefined,
      index: {
        valueUnquoted: 'logst*',
      },
      name: 'logst*',
      sourceType: 'index',
      location: {
        min: 5,
        max: 10,
      },
      incomplete: false,
      text: 'logst*',
    } as WalkerAstNode;

    expect(getVariablesHoverContent(node)).toEqual([]);
  });

  test('should return the variable content if user is hovering over a variable', () => {
    const node = {
      value: 'field',
      location: {
        min: 96,
        max: 101,
      },
      text: '?field',
      incomplete: false,
      name: '',
      type: 'literal',
      literalType: 'param',
      paramType: 'named',
    } as WalkerAstNode;
    const variables = [
      {
        key: 'field',
        value: 'agent',
        type: ESQLVariableType.FIELDS,
      },
    ];

    expect(getVariablesHoverContent(node, variables)).toEqual([
      {
        value: '**field**: agent',
      },
    ]);
  });
});

describe('correctQuerySyntax', () => {
  test('should close unclosed brackets', () => {
    expect(correctQuerySyntax('FROM logs | WHERE round(', 30)).toBe('FROM logs | WHERE round()');
  });

  test('should remove commands after the offset', () => {
    const query = 'FROM logs | WHERE field = "value" | STATS count()';
    expect(correctQuerySyntax(query, 25)).toBe('FROM logs | WHERE field = "value" ');
  });

  test('should replace partial function arguments with closing parenthesis', () => {
    expect(correctQuerySyntax('FROM logs | WHERE count(field,)', 25)).toBe(
      'FROM logs | WHERE count(field)'
    );
  });

  test('should handle query with no issues', () => {
    const query = 'FROM logs | WHERE field = "value"';
    expect(correctQuerySyntax(query, 20)).toBe(query);
  });

  test('should handle offset at the end of query', () => {
    const query = 'FROM logs';
    expect(correctQuerySyntax(query, query.length)).toBe(query);
  });

  test('should handle complex query with all corrections needed', () => {
    const query = 'FROM logs | WHERE field IN (value, round(arg, | STATS count(,) | LIMIT 10';
    const expected = 'FROM logs | WHERE field IN (value, round(arg))';
    expect(correctQuerySyntax(query, 40)).toBe(expected);
  });

  test('should handle nested function calls with unclosed brackets', () => {
    expect(correctQuerySyntax('FROM logs | WHERE avg(round(field', 33)).toBe(
      'FROM logs | WHERE avg(round(field))'
    );
  });
});
