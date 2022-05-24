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
        "findFunction": [Function],
        "functions": Array [
          Object {
            "addArgument": [Function],
            "arguments": Object {},
            "getArgument": [Function],
            "name": "kibana",
            "removeArgument": [Function],
            "replaceArgument": [Function],
            "toAst": [Function],
            "toString": [Function],
            "type": "expression_function_builder",
          },
          Object {
            "addArgument": [Function],
            "arguments": Object {
              "filters": Array [],
              "q": Array [
                Object {
                  "findFunction": [Function],
                  "functions": Array [
                    Object {
                      "addArgument": [Function],
                      "arguments": Object {
                        "q": Array [
                          "\\"\\"",
                        ],
                      },
                      "getArgument": [Function],
                      "name": "lucene",
                      "removeArgument": [Function],
                      "replaceArgument": [Function],
                      "toAst": [Function],
                      "toString": [Function],
                      "type": "expression_function_builder",
                    },
                  ],
                  "toAst": [Function],
                  "toString": [Function],
                  "type": "expression_builder",
                },
              ],
              "timeRange": Array [
                Object {
                  "findFunction": [Function],
                  "functions": Array [
                    Object {
                      "addArgument": [Function],
                      "arguments": Object {
                        "from": Array [
                          "now",
                        ],
                        "to": Array [
                          "now+7d",
                        ],
                      },
                      "getArgument": [Function],
                      "name": "timerange",
                      "removeArgument": [Function],
                      "replaceArgument": [Function],
                      "toAst": [Function],
                      "toString": [Function],
                      "type": "expression_function_builder",
                    },
                  ],
                  "toAst": [Function],
                  "toString": [Function],
                  "type": "expression_builder",
                },
              ],
            },
            "getArgument": [Function],
            "name": "kibana_context",
            "removeArgument": [Function],
            "replaceArgument": [Function],
            "toAst": [Function],
            "toString": [Function],
            "type": "expression_function_builder",
          },
        ],
        "toAst": [Function],
        "toString": [Function],
        "type": "expression_builder",
      }
    `);
  });
});
