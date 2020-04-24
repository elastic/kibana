/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ExpressionAstExpression } from './types';
import { buildExpression } from './build_expression';
import { buildExpressionFunction, ExpressionAstFunctionBuilder } from './build_function';
import { format } from './format';

describe('buildExpression()', () => {
  let ast: ExpressionAstExpression;
  let str: string;

  beforeEach(() => {
    ast = {
      type: 'expression',
      chain: [
        {
          type: 'function',
          arguments: {
            bar: ['baz'],
            subexp: [
              {
                type: 'expression',
                chain: [
                  {
                    type: 'function',
                    function: 'hello',
                    arguments: {
                      world: [false, true],
                    },
                  },
                ],
              },
            ],
          },
          function: 'foo',
        },
      ],
    };
    str = format(ast, 'expression');
  });

  test('accepts an expression AST as input', () => {
    const exp = buildExpression(ast);
    expect(exp.toAst()).toEqual(ast);
  });

  test('accepts an expresssion string as input', () => {
    const exp = buildExpression(str);
    expect(exp.toAst()).toEqual(ast);
  });

  test('accepts an array of function builders as input', () => {
    const firstFn = ast.chain[0];
    const exp = buildExpression([
      buildExpressionFunction(firstFn.function, firstFn.arguments),
      buildExpressionFunction('hiya', {}),
    ]);
    expect(exp.toAst()).toMatchInlineSnapshot(`
      Object {
        "chain": Array [
          Object {
            "arguments": Object {
              "bar": Array [
                "baz",
              ],
              "subexp": Array [
                Object {
                  "chain": Array [
                    Object {
                      "arguments": Object {
                        "world": Array [
                          false,
                          true,
                        ],
                      },
                      "function": "hello",
                      "type": "function",
                    },
                  ],
                  "type": "expression",
                },
              ],
            },
            "function": "foo",
            "type": "function",
          },
          Object {
            "arguments": Object {},
            "function": "hiya",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
  });

  describe('#addFunction', () => {
    test('adds new function to the AST', () => {
      const exp = buildExpression(ast);
      const fn = buildExpressionFunction('test', { abc: [123] });
      exp.addFunction(fn);
      expect(exp.toAst()).toMatchInlineSnapshot(`
        Object {
          "chain": Array [
            Object {
              "arguments": Object {
                "bar": Array [
                  "baz",
                ],
                "subexp": Array [
                  Object {
                    "chain": Array [
                      Object {
                        "arguments": Object {
                          "world": Array [
                            false,
                            true,
                          ],
                        },
                        "function": "hello",
                        "type": "function",
                      },
                    ],
                    "type": "expression",
                  },
                ],
              },
              "function": "foo",
              "type": "function",
            },
            Object {
              "arguments": Object {
                "abc": Array [
                  123,
                ],
              },
              "function": "test",
              "type": "function",
            },
          ],
          "type": "expression",
        }
      `);
    });
  });

  describe('#toAst', () => {
    test('generates the AST for an expression', () => {
      const exp = buildExpression('foo | bar hello=true hello=false');
      expect(exp.toAst()).toMatchInlineSnapshot(`
        Object {
          "chain": Array [
            Object {
              "arguments": Object {},
              "function": "foo",
              "type": "function",
            },
            Object {
              "arguments": Object {
                "hello": Array [
                  true,
                  false,
                ],
              },
              "function": "bar",
              "type": "function",
            },
          ],
          "type": "expression",
        }
      `);
    });

    test('throws when called on an expression with no functions', () => {
      ast.chain = [];
      const exp = buildExpression(ast);
      expect(() => {
        exp.toAst();
      }).toThrowError();
    });
  });

  describe('#toString', () => {
    test('generates an expression string from the AST', () => {
      const exp = buildExpression(ast);
      expect(exp.toString()).toMatchInlineSnapshot(
        `"foo bar=\\"baz\\" subexp={hello world=false world=true}"`
      );
    });

    test('throws when called on an expression with no functions', () => {
      ast.chain = [];
      const exp = buildExpression(ast);
      expect(() => {
        exp.toString();
      }).toThrowError();
    });
  });

  describe('#findFunction', () => {
    test('finds a function by name', () => {
      const exp = buildExpression(`where | is | waldo`);
      const fns: ExpressionAstFunctionBuilder[] = exp.findFunction('waldo');
      expect(fns.map(fn => fn.toAst())).toMatchInlineSnapshot(`
        Array [
          Object {
            "arguments": Object {},
            "function": "waldo",
            "type": "function",
          },
        ]
      `);
    });

    test('recursively finds nested subexpressions', () => {
      const exp = buildExpression(
        `miss | miss sub={miss} | miss sub={hit sub={miss sub={hit sub={hit}}}} sub={miss}`
      );
      const fns: ExpressionAstFunctionBuilder[] = exp.findFunction('hit');
      expect(fns.map(fn => fn.name)).toMatchInlineSnapshot(`
        Array [
          "hit",
          "hit",
          "hit",
        ]
      `);
    });

    test('retains references back to the original expression so you can perform migrations', () => {
      const before = `
        foo sub={baz | bar a=1 sub={foo}}
        | bar a=1
        | baz sub={bar a=1 c=4 sub={bar a=1 c=5}}
      `;

      // Migrates all `bar` functions in the expression
      const exp = buildExpression(before);
      exp.findFunction('bar').forEach(fn => {
        const arg = fn.getArgument('a');
        if (arg) {
          fn.replaceArgument('a', [1, 2]);
          fn.addArgument('b', 3);
          fn.removeArgument('c');
        }
      });

      expect(exp.toString()).toMatchInlineSnapshot(`
        "foo sub={baz | bar a=1 a=2 sub={foo} b=3}
        | bar a=1 a=2 b=3
        | baz sub={bar a=1 a=2 sub={bar a=1 a=2 b=3} b=3}"
      `);
    });
  });
});
