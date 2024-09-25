/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filtersToAst } from './filters_to_ast';

describe('interpreter/functions#filtersToAst', () => {
  const normalFilter = {
    meta: { negate: false, alias: '', disabled: false },
    query: { query_string: { query: 'something' } },
  };
  const negatedFilter = {
    meta: { negate: true, alias: '', disabled: false },
    query: { query_string: { query: 'test' } },
  };

  it('converts a list of filters to an expression AST node', () => {
    const actual = filtersToAst([normalFilter, negatedFilter]);

    expect(actual).toHaveLength(2);
    expect(actual).toHaveProperty('0.chain.0.function', 'kibanaFilter');
    expect(actual).toHaveProperty(
      '0.chain.0.arguments',
      expect.objectContaining({
        disabled: [false],
        negate: [false],
        query: ['{"query_string":{"query":"something"}}'],
      })
    );

    expect(actual).toHaveLength(2);
    expect(actual).toHaveProperty('1.chain.0.function', 'kibanaFilter');
    expect(actual).toHaveProperty(
      '1.chain.0.arguments',
      expect.objectContaining({
        disabled: [false],
        negate: [true],
        query: ['{"query_string":{"query":"test"}}'],
      })
    );
  });
});
