/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
            name: 'a',
            parts: ['a'],
          },
          {
            type: 'column',
            name: 'b.c',
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
            name: 'a',
            parts: ['a'],
          },
          {
            type: 'column',
            name: 'b.c',
            parts: ['b', 'c'],
          },
          {
            type: 'column',
            name: 'd.`👍`.`123``123`',
            parts: ['d', '👍', '123`123'],
          },
        ],
      },
    ]);
  });

  it('in KEEP command', () => {
    const text = 'FROM a | KEEP a.b';
    const { ast } = parse(text);

    console.log(JSON.stringify(ast, null, 2));

    expect(ast).toMatchObject([
      {
        type: 'command',
        args: [
          {
            type: 'column',
            name: 'a.b',
            parts: ['a', 'b'],
          },
        ],
      },
    ]);
  });
});
