/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { correctQuerySyntax } from './query_syntax_helpers';

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
    const query = 'FROM logs | WHERE field IN (value, round(arg,| STATS count(,) | LIMIT 10';
    const expected = 'FROM logs | WHERE field IN (value, round(arg))';
    expect(correctQuerySyntax(query, 40)).toBe(expected);
  });

  // Preserving spaces makes it easier to detect the cursor position when calculating the current argument.
  test('should preserve spaces when replacing partial function arguments', () => {
    const query = 'FROM logs | WHERE field IN (value, round(arg,  ';
    const expected = 'FROM logs | WHERE field IN (value, round(arg  ))';
    expect(correctQuerySyntax(query, 40)).toBe(expected);
  });

  test('should handle nested function calls with unclosed brackets', () => {
    expect(correctQuerySyntax('FROM logs | WHERE avg(round(field', 33)).toBe(
      'FROM logs | WHERE avg(round(field))'
    );
  });
});
