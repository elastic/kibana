/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { filtersToAst } from './filters_to_ast';

describe('interpreter/functions#filtersToAst', () => {
  const normalFilter = {
    meta: { negate: false, alias: '', disabled: false },
    query: { test: 'something' },
  };
  const negatedFilter = {
    meta: { negate: true, alias: '', disabled: false },
    query: { test: 'something' },
  };

  it('converts a list of filters to an expression AST node', () => {
    const actual = filtersToAst([normalFilter, negatedFilter]);
    expect(actual).toHaveLength(2);
    expect(actual[0].functions[0]).toHaveProperty('name', 'kibanaFilter');
    expect(actual[0].functions[0].arguments).toMatchInlineSnapshot(`
      Object {
        "disabled": Array [
          false,
        ],
        "negate": Array [
          false,
        ],
        "query": Array [
          "{\\"query\\":{\\"test\\":\\"something\\"}}",
        ],
      }
    `);
    expect(actual[1].functions[0]).toHaveProperty('name', 'kibanaFilter');
    expect(actual[1].functions[0].arguments).toMatchInlineSnapshot(`
      Object {
        "disabled": Array [
          false,
        ],
        "negate": Array [
          true,
        ],
        "query": Array [
          "{\\"query\\":{\\"test\\":\\"something\\"}}",
        ],
      }
    `);
  });
});
