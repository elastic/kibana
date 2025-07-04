/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseExpression } from './parse_expression';

describe('parseExpression()', () => {
  test('parses an expression', () => {
    const ast = parseExpression('foo bar="baz"');

    expect(ast).toMatchObject({
      type: 'expression',
      chain: [
        {
          type: 'function',
          arguments: {
            bar: ['baz'],
          },
          function: 'foo',
        },
      ],
    });
  });

  test('parses an expression with sub-expression', () => {
    const ast = parseExpression('foo bar="baz" quux={quix}');

    expect(ast).toMatchObject({
      type: 'expression',
      chain: [
        {
          type: 'function',
          arguments: {
            bar: ['baz'],
            quux: [
              {
                type: 'expression',
                chain: [
                  {
                    type: 'function',
                    function: 'quix',
                    arguments: {},
                  },
                ],
              },
            ],
          },
          function: 'foo',
        },
      ],
    });
  });
});
