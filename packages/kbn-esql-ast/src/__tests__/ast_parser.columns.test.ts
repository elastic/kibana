/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAstAndSyntaxErrors as parse } from '../ast_parser';

describe('Column Identifier Expressions', () => {
  it('can parse un-quoted identifiers', () => {
    const text = 'ROW a, b.c';
    const { ast } = parse(text);

    expect(ast).toMatchObject([
      {
        type: 'command',
        args: [
          {
            type: 'column',
            parts: ['a'],
          },
          {
            type: 'column',
            parts: ['b', 'c'],
          },
        ],
      },
    ]);
  });

  it('can parse quoted identifiers', () => {
    const text = 'ROW `a`, `b`.c, `d`.`👍`.`123``123`';
    const { ast } = parse(text);

    expect(ast).toMatchObject([
      {
        type: 'command',
        args: [
          {
            type: 'column',
            parts: ['a'],
          },
          {
            type: 'column',
            parts: ['b', 'c'],
          },
          {
            type: 'column',
            parts: ['d', '👍', '123`123'],
          },
        ],
      },
    ]);
  });

  it('can mix quoted and un-quoted identifiers', () => {
    const text = 'ROW part1.part2.`part``3️⃣`';
    const { ast } = parse(text);

    expect(ast).toMatchObject([
      {
        type: 'command',
        args: [
          {
            type: 'column',
            parts: ['part1', 'part2', 'part`3️⃣'],
          },
        ],
      },
    ]);
  });

  it('in KEEP command', () => {
    const text = 'FROM a | KEEP a.b';
    const { ast } = parse(text);

    expect(ast).toMatchObject([
      {},
      {
        type: 'command',
        args: [
          {
            type: 'column',
            parts: ['a', 'b'],
          },
        ],
      },
    ]);
  });
});
