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
  let subexp: ExpressionAstExpression;
  let ast: ExpressionAstExpression;

  beforeEach(() => {
    subexp = {
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
    };
    ast = {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'foo',
          arguments: {
            bar: ['baz'],
            subexp: [subexp],
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

  test('wraps any args in initial state in an array', () => {
    const fn = buildExpressionFunction('hello', { world: true });
    expect(fn.arguments).toMatchInlineSnapshot(`
      Object {
        "world": Array [
          true,
        ],
      }
    `);
  });

  test('ignores any args in initial state which value is undefined', () => {
    const fn = buildExpressionFunction('hello', { world: undefined });
    expect(fn.arguments).not.toHaveProperty('world');
  });

  test('returns all expected properties', () => {
    const fn = buildExpressionFunction('hello', { world: [true] });
    expect(Object.keys(fn)).toMatchInlineSnapshot(`
      Array [
        "type",
        "name",
        "arguments",
        "addArgument",
        "getArgument",
        "replaceArgument",
        "removeArgument",
        "toAst",
        "toString",
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

  test('handles subexpressions in multi-args in initial state', () => {
    const subexpression = buildExpression([buildExpressionFunction('mySubexpression', {})]);
    const fn = buildExpressionFunction('hello', { world: [true, subexpression] });
    expect(fn.toAst().arguments.world).toMatchInlineSnapshot(`
      Array [
        true,
        Object {
          "chain": Array [
            Object {
              "arguments": Object {},
              "function": "mySubexpression",
              "type": "function",
            },
          ],
          "type": "expression",
        },
      ]
    `);
  });

  describe('handles subexpressions as args', () => {
    test('when provided an AST for the subexpression', () => {
      const fn = buildExpressionFunction('hello', { world: [true] });
      fn.addArgument('subexp', buildExpression(subexp).toAst());
      expect(fn.toAst().arguments.subexp).toMatchInlineSnapshot(`
        Array [
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
        ]
      `);
    });

    test('when provided a function builder for the subexpression', () => {
      // test using `markdownVis`, which expects a subexpression
      // using the `font` function
      const anotherSubexpression = buildExpression([buildExpressionFunction('font', { size: 12 })]);
      const fn = buildExpressionFunction('markdownVis', {
        markdown: 'hello',
        openLinksInNewTab: true,
        font: anotherSubexpression,
      });
      expect(fn.toAst().arguments.font).toMatchInlineSnapshot(`
        Array [
          Object {
            "chain": Array [
              Object {
                "arguments": Object {
                  "size": Array [
                    12,
                  ],
                },
                "function": "font",
                "type": "function",
              },
            ],
            "type": "expression",
          },
        ]
      `);
    });

    test('when subexpressions are changed by reference', () => {
      const fontFn = buildExpressionFunction('font', { size: 12 });
      const fn = buildExpressionFunction('markdownVis', {
        markdown: 'hello',
        openLinksInNewTab: true,
        font: buildExpression([fontFn]),
      });
      fontFn.addArgument('color', 'blue');
      fontFn.replaceArgument('size', [72]);
      expect(fn.toAst().arguments.font).toMatchInlineSnapshot(`
        Array [
          Object {
            "chain": Array [
              Object {
                "arguments": Object {
                  "color": Array [
                    "blue",
                  ],
                  "size": Array [
                    72,
                  ],
                },
                "function": "font",
                "type": "function",
              },
            ],
            "type": "expression",
          },
        ]
      `);
    });
  });

  describe('#addArgument', () => {
    test('allows you to add a new argument', () => {
      const fn = buildExpressionFunction('hello', { world: [true] });
      fn.addArgument('world', false);
      expect(fn.toAst().arguments).toMatchInlineSnapshot(`
        Object {
          "world": Array [
            true,
            false,
          ],
        }
      `);
    });

    test('creates new args if they do not yet exist', () => {
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

    test('does not add new argument if the value is undefined', () => {
      const fn = buildExpressionFunction('hello', { world: [true] });
      fn.addArgument('foo', undefined);
      expect(fn.toAst().arguments).toMatchInlineSnapshot(`
        Object {
          "world": Array [
            true,
          ],
        }
      `);
    });

    test('mutates a function already associated with an expression', () => {
      const fn = buildExpressionFunction('hello', { world: [true] });
      const exp = buildExpression([fn]);
      fn.addArgument('foo', 'bar');
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

    test('returned array can be updated to add/remove multiargs', () => {
      const fn = buildExpressionFunction('hello', { world: [0, 1] });
      const arg = fn.getArgument('world');
      arg!.push(2);
      expect(fn.getArgument('world')).toEqual([0, 1, 2]);
      fn.replaceArgument(
        'world',
        arg!.filter((a) => a !== 1)
      );
      expect(fn.getArgument('world')).toEqual([0, 2]);
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

  describe('#toString', () => {
    test('returns a function String', () => {
      const fn = buildExpressionFunction('hello', { foo: [true], bar: ['hi'] });
      expect(fn.toString()).toMatchInlineSnapshot(`"hello foo=true bar=\\"hi\\""`);
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
