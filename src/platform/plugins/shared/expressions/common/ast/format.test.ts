/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExpressionAstExpression, ExpressionAstArgument } from './types';
import { format } from './format';

describe('format()', () => {
  test('formats an expression AST', () => {
    const ast: ExpressionAstExpression = {
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
    };

    expect(format(ast, 'expression')).toMatchInlineSnapshot(`"foo bar=\\"baz\\""`);
  });

  test('formats an argument', () => {
    const ast: ExpressionAstArgument = 'foo';
    expect(format(ast, 'argument')).toMatchInlineSnapshot(`"\\"foo\\""`);
  });
});
