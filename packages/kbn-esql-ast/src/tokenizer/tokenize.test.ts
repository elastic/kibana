/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Token, tokenize } from './tokenize';

describe('tokenizer', () => {
  it('should tokenize a line', () => {
    const tokens = tokenize('FROM my_index | WHERE field1 = 1 AND field2 = 2');
    expect(tokens.map((t) => t.name)).toEqual([
      'from',
      'from_ws',
      'unquoted_source',
      'from_ws',
      'pipe',
      'ws',
      'where',
      'expr_ws',
      'unquoted_identifier',
      'expr_ws',
      'assign',
      'expr_ws',
      'integer_literal',
      'expr_ws',
      'and',
      'expr_ws',
      'unquoted_identifier',
      'expr_ws',
      'assign',
      'expr_ws',
      'integer_literal',
    ]);
  });

  it('should tokenize a line that begins with a pipe', () => {
    const tokens = tokenize('  |  EVAL ABS(field1)');
    expect(tokens).toEqual<Token[]>([
      { name: 'pipe', start: 2 },
      { name: 'ws', start: 3 },
      { name: 'eval', start: 5 },
      { name: 'expr_ws', start: 9 },
      { name: 'function_name', start: 10 },
      { name: 'lp', start: 13 },
      { name: 'unquoted_identifier', start: 14 },
      { name: 'rp', start: 20 },
    ]);
  });

  it('should tokenize opening and closing multiline comment markers', () => {
    expect(tokenize('/* this')[0]).toEqual<Token>({ name: 'multiline_comment_start', start: 0 });
    const tokens2 = tokenize('is a comment */');
    expect(tokens2[tokens2.length - 1]).toEqual<Token>({
      name: 'multiline_comment_end_expr',
      start: 13,
    });
  });

  it('should tokenize function names', () => {
    const tokens = tokenize(
      'FROM my_index | EVAL date_diff("day", NOW()) | STATS abs  (field1), avg( field1 )'
    );
    const functionTokens = tokens.filter((t) => t.name === 'function_name');
    expect(functionTokens).toHaveLength(4);
  });

  it('should tokenize SORT... NULLS clauses', () => {
    const tokens = tokenize(
      'SELECT * FROM my_index | SORT BY field1 ASC NULLS FIRST, field2 DESC NULLS LAST'
    );
    // Make sure the tokens got merged properly
    const nullsOrderTokens = tokens.filter((t) => t.name === 'nulls_order');
    expect(nullsOrderTokens).toHaveLength(2);
    expect(nullsOrderTokens).toEqual<Token[]>([
      {
        name: 'nulls_order',
        start: 44,
      },
      {
        name: 'nulls_order',
        start: 69,
      },
    ]);
    // Ensure that the NULLS FIRST and NULLS LAST tokens are not present
    expect(tokens.map((t) => t.name)).not.toContain('nulls.esql');
    expect(tokens.map((t) => t.name)).not.toContain('first.esql');
    expect(tokens.map((t) => t.name)).not.toContain('last.esql');
  });

  it('should tokenize timespan literals', () => {
    const tokens = tokenize(
      'SELECT * FROM my_index | WHERE date_field > 1 day AND other_field < 2 hours'
    );
    const timespanTokens = tokens.filter((t) => t.name === 'timespan_literal');
    expect(timespanTokens).toHaveLength(2);
  });
});
