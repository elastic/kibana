/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { queryFilterToAst } from './query_filter_to_ast';

describe('queryFilterToAst', () => {
  it('should return an expression', () => {
    expect(queryFilterToAst({ input: { query: 'a: b', language: 'kuery' } })).toHaveProperty(
      'type',
      'expression'
    );
  });

  it('should forward arguments', () => {
    expect(
      queryFilterToAst({ input: { query: 'a: b', language: 'kuery' }, label: 'something' })
    ).toHaveProperty(
      'chain.0.arguments',
      expect.objectContaining({
        label: ['something'],
      })
    );
  });

  it('should construct a query filter in sub-expressions', () => {
    expect(queryFilterToAst({ input: { query: 'a: b', language: 'kuery' } }))
      .toMatchInlineSnapshot(`
      Object {
        "chain": Array [
          Object {
            "arguments": Object {
              "input": Array [
                Object {
                  "chain": Array [
                    Object {
                      "arguments": Object {
                        "q": Array [
                          "a: b",
                        ],
                      },
                      "function": "kql",
                      "type": "function",
                    },
                  ],
                  "type": "expression",
                },
              ],
            },
            "function": "queryFilter",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
  });
});
