/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { queryStateToExpressionAst } from './to_expression_ast';

describe('queryStateToExpressionAst', () => {
  it('returns an object with the correct structure', () => {
    const actual = queryStateToExpressionAst({
      filters: [],
      query: { language: 'lucene', query: '' },
      time: {
        from: 'now',
        to: 'now+7d',
      },
    });

    expect(actual).toMatchInlineSnapshot(`
      Object {
        "chain": Array [
          Object {
            "arguments": Object {},
            "function": "kibana",
            "type": "function",
          },
          Object {
            "arguments": Object {
              "timeRange": Array [
                Object {
                  "chain": Array [
                    Object {
                      "arguments": Object {
                        "from": Array [
                          "now",
                        ],
                        "to": Array [
                          "now+7d",
                        ],
                      },
                      "function": "timerange",
                      "type": "function",
                    },
                  ],
                  "type": "expression",
                },
              ],
            },
            "function": "kibana_context",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
  });
});
