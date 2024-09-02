/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ESQLState } from './esql_state';
import { ESQLToken } from './esql_token';
import { ESQLTokensProvider } from './esql_tokens_provider';

describe('ES|QL Tokens Provider', () => {
  it('should tokenize a line', () => {
    const line = 'SELECT * FROM my_index';
    const prevState = new ESQLState();
    const provider = new ESQLTokensProvider();
    const { tokens } = provider.tokenize(line, prevState);
    expect(tokens.map((t) => t.scopes)).toEqual([
      'unknown_cmd.esql',
      'expr_ws.esql',
      'asterisk.esql',
      'expr_ws.esql',
      'unquoted_identifier.esql',
      'expr_ws.esql',
      'unquoted_identifier.esql',
    ]);
  });

  it('should properly tokenize functions', () => {
    const line = 'FROM my_index | EVAL date_diff("day", NOW()) | STATS abs(field1), avg(field1)';
    const provider = new ESQLTokensProvider();
    const { tokens } = provider.tokenize(line, new ESQLState());
    const functionTokens = tokens.filter((t) => t.scopes === 'functions.esql');
    expect(functionTokens).toHaveLength(4);
  });

  it('should properly tokenize SORT... NULLS clauses', () => {
    const line = 'SELECT * FROM my_index | SORT BY field1 ASC NULLS FIRST, field2 DESC NULLS LAST';
    const provider = new ESQLTokensProvider();
    const { tokens } = provider.tokenize(line, new ESQLState());
    // Make sure the tokens got merged properly
    const nullsOrderTokens = tokens.filter((t) => t.scopes === 'nulls_order.esql');
    expect(nullsOrderTokens).toHaveLength(2);
    expect(nullsOrderTokens).toEqual<ESQLToken[]>([
      {
        scopes: 'nulls_order.esql',
        startIndex: 44,
        stopIndex: 54,
      },
      {
        scopes: 'nulls_order.esql',
        startIndex: 69,
        stopIndex: 78,
      },
    ]);
    // Ensure that the NULLS FIRST and NULLS LAST tokens are not present
    expect(tokens.map((t) => t.scopes)).not.toContain('nulls.esql');
    expect(tokens.map((t) => t.scopes)).not.toContain('first.esql');
    expect(tokens.map((t) => t.scopes)).not.toContain('last.esql');
  });

  it('should properly tokenize timespan literals', () => {
    const line = 'SELECT * FROM my_index | WHERE date_field > 1 day AND other_field < 2 hours';
    const provider = new ESQLTokensProvider();
    const { tokens } = provider.tokenize(line, new ESQLState());
    const timespanTokens = tokens.filter((t) => t.scopes === 'timespan_literal.esql');
    expect(timespanTokens).toHaveLength(2);
  });
});
