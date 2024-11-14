/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '..';
import { ESQLLiteral } from '../../types';

describe('literal expression', () => {
  it('numeric expression captures "value", and "name" fields', () => {
    const text = 'ROW 1';
    const { ast } = parse(text);
    const literal = ast[0].args[0] as ESQLLiteral;

    expect(literal).toMatchObject({
      type: 'literal',
      literalType: 'integer',
      name: '1',
      value: 1,
    });
  });

  it('doubles vs integers', () => {
    const text = 'ROW a(1.0, 1)';
    const { ast } = parse(text);

    expect(ast[0]).toMatchObject({
      type: 'command',
      args: [
        {
          type: 'function',
          args: [
            {
              type: 'literal',
              literalType: 'double',
            },
            {
              type: 'literal',
              literalType: 'integer',
            },
          ],
        },
      ],
    });
  });
});
