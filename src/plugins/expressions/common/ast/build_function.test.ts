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
import { buildExpressionFunction } from './build_function';

describe('buildExpressionFunction()', () => {
  let ast: ExpressionAstExpression;

  beforeEach(() => {
    ast = {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'foo',
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
        },
      ],
    };
  });

  test('accepts an args object as initial state', () => {
    const fn = buildExpressionFunction('hello', { world: [true] });
    expect(fn.toAst()).toMatchInlineSnapshot(`
      Object {
        "arguments": Object {
          "world": Array [
            true,
          ],
        },
        "function": "hello",
        "type": "function",
      }
    `);
  });

  test('returns all expected properties', () => {
    const fn = buildExpressionFunction('hello', { world: [true] });
    expect(Object.keys(fn)).toMatchInlineSnapshot(`
      Array [
        "name",
        "arguments",
        "addArgument",
        "getArgument",
        "replaceArgument",
        "removeArgument",
        "toAst",
      ]
    `);
  });

  test('handles subexpressions in initial state', () => {
    const fn = buildExpressionFunction(ast.chain[0].function, ast.chain[0].arguments);
    expect(fn.toAst()).toMatchInlineSnapshot(`
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
      }
    `);
  });

  describe('#addArgument', () => {
    test('allows you to add a new argument', () => {
      const fn = buildExpressionFunction('hello', { world: [true] });
      fn.addArgument('foo', ['bar']);
      expect(fn.toAst().arguments).toMatchInlineSnapshot(`
        Object {
          "foo": Array [
            "bar",
          ],
          "world": Array [
            true,
          ],
        }
      `);
    });

    test('wraps new primitive arguments in an array', () => {
      const fn = buildExpressionFunction('hello', { world: [true] });
      fn.addArgument('foo', 'bar');
      expect(fn.toAst().arguments).toMatchInlineSnapshot(`
        Object {
          "foo": Array [
            "bar",
          ],
          "world": Array [
            true,
          ],
        }
      `);
    });

    test('throws an error when adding an arg which already exists', () => {
      const fn = buildExpressionFunction('hello', { world: [true] });
      expect(() => {
        fn.addArgument('world', false);
      }).toThrowError();
    });

    test('handles subexpressions as args', () => {
      const fn = buildExpressionFunction('hello', { world: [true] });
      fn.addArgument('subexp', ast.chain[0].arguments.subexp);
      expect(fn.toAst().arguments).toMatchInlineSnapshot(`
        Object {
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
          "world": Array [
            true,
          ],
        }
      `);
    });

    test('mutates a function already associated with an expression', () => {
      const fn = buildExpressionFunction('hello', { world: [true] });
      const exp = buildExpression([fn]);
      fn.addArgument('foo', ['bar']);
      expect(exp.toAst().chain).toMatchInlineSnapshot(`
        Array [
          Object {
            "arguments": Object {
              "foo": Array [
                "bar",
              ],
              "world": Array [
                true,
              ],
            },
            "function": "hello",
            "type": "function",
          },
        ]
      `);
      fn.removeArgument('foo');
      expect(exp.toAst().chain).toMatchInlineSnapshot(`
        Array [
          Object {
            "arguments": Object {
              "world": Array [
                true,
              ],
            },
            "function": "hello",
            "type": "function",
          },
        ]
      `);
    });
  });

  describe('#getArgument', () => {
    test('retrieves an arg by name', () => {
      const fn = buildExpressionFunction('hello', { world: [true] });
      expect(fn.getArgument('world')).toEqual([true]);
    });

    test(`returns undefined when an arg doesn't exist`, () => {
      const fn = buildExpressionFunction('hello', { world: [true] });
      expect(fn.getArgument('test')).toBe(undefined);
    });
  });

  describe('#toAst', () => {
    test('returns a function AST', () => {
      const fn = buildExpressionFunction('hello', { foo: [true] });
      expect(fn.toAst()).toMatchInlineSnapshot(`
        Object {
          "arguments": Object {
            "foo": Array [
              true,
            ],
          },
          "function": "hello",
          "type": "function",
        }
      `);
    });
  });

  describe('#replaceArgument', () => {
    test('allows you to replace an existing argument', () => {
      const fn = buildExpressionFunction('hello', { world: [true] });
      fn.replaceArgument('world', [false]);
      expect(fn.toAst().arguments).toMatchInlineSnapshot(`
        Object {
          "world": Array [
            false,
          ],
        }
      `);
    });

    test('allows you to replace an existing argument with multi args', () => {
      const fn = buildExpressionFunction('hello', { world: [true] });
      fn.replaceArgument('world', [true, false]);
      expect(fn.toAst().arguments).toMatchInlineSnapshot(`
        Object {
          "world": Array [
            true,
            false,
          ],
        }
      `);
    });

    test('throws an error when replacing a non-existant arg', () => {
      const fn = buildExpressionFunction('hello', { world: [true] });
      expect(() => {
        fn.replaceArgument('whoops', [false]);
      }).toThrowError();
    });
  });

  describe('#removeArgument', () => {
    test('removes an argument by name', () => {
      const fn = buildExpressionFunction('hello', { foo: [true], bar: [false] });
      fn.removeArgument('bar');
      expect(fn.toAst().arguments).toMatchInlineSnapshot(`
        Object {
          "foo": Array [
            true,
          ],
        }
      `);
    });
  });
});
