/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { formatExpression } from './format_expression';

describe('formatExpression()', () => {
  test('converts expression AST to string', () => {
    const str = formatExpression({
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

    expect(str).toMatchInlineSnapshot(`"foo bar=\\"baz\\""`);
  });
});
