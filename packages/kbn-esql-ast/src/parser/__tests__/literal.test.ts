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
    const { root } = parse(text);
    const literal = root.commands[0].args[0] as ESQLLiteral;

    expect(literal).toMatchObject({
      type: 'literal',
      literalType: 'integer',
      name: '1',
      value: 1,
    });
  });

  it('decimals vs integers', () => {
    const text = 'ROW a(1.0, 1)';
    const { root } = parse(text);

    expect(root.commands[0]).toMatchObject({
      type: 'command',
      args: [
        {
          type: 'function',
          args: [
            {
              type: 'literal',
              literalType: 'decimal',
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

  it('negative number', () => {
    const text = 'ROW -1';
    const { root } = parse(text);

    expect(root.commands[0]).toMatchObject({
      type: 'command',
      args: [
        {
          type: 'literal',
          literalType: 'integer',
          value: -1,
        },
      ],
    });
  });

  it('chained negation expression', () => {
    const text = 'ROW -(-1)';
    const { root } = parse(text);

    expect(root.commands[0]).toMatchObject({
      type: 'command',
      args: [
        {
          type: 'function',
          subtype: 'unary-expression',
          name: '-',
          args: [
            {
              type: 'literal',
              literalType: 'integer',
              value: -1,
            },
          ],
        },
      ],
    });
  });

  it('many chained unary expressions', () => {
    const text = 'ROW -(+(-(+(-1))))';
    const { root } = parse(text);

    expect(root.commands[0]).toMatchObject({
      type: 'command',
      args: [
        {
          type: 'function',
          subtype: 'unary-expression',
          name: '-',
          args: [
            {
              type: 'function',
              subtype: 'unary-expression',
              name: '+',
              args: [
                {
                  type: 'function',
                  subtype: 'unary-expression',
                  name: '-',
                  args: [
                    {
                      type: 'function',
                      subtype: 'unary-expression',
                      name: '+',
                      args: [
                        {
                          type: 'literal',
                          literalType: 'integer',
                          value: -1,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
