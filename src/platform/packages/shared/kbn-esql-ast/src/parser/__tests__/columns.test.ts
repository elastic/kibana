/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '..';

describe('Column Identifier Expressions', () => {
  it('can parse star column as function argument', () => {
    const text = 'ROW fn(*)';
    const { root } = parse(text);

    expect(root.commands).toMatchObject([
      {
        type: 'command',
        name: 'row',
        args: [
          {
            type: 'function',
            name: 'fn',
            args: [
              {
                type: 'column',
                args: [
                  {
                    type: 'identifier',
                    name: '*',
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('can parse a single identifier', () => {
    const text = 'ROW hello';
    const { root } = parse(text);

    expect(root.commands).toMatchObject([
      {
        type: 'command',
        args: [
          {
            type: 'column',
            args: [
              {
                type: 'identifier',
                name: 'hello',
              },
            ],
          },
        ],
      },
    ]);
  });

  it('can parse un-quoted identifiers', () => {
    const text = 'ROW a, b.c';
    const { root } = parse(text);

    expect(root.commands).toMatchObject([
      {
        type: 'command',
        args: [
          {
            type: 'column',
            args: [
              {
                type: 'identifier',
                name: 'a',
              },
            ],
          },
          {
            type: 'column',
            args: [
              {
                type: 'identifier',
                name: 'b',
              },
              {
                type: 'identifier',
                name: 'c',
              },
            ],
          },
        ],
      },
    ]);
  });

  it('can parse quoted identifiers', () => {
    const text = 'ROW `a`, `b`.c, `d`.`👍`.`123``123`';
    const { root } = parse(text);

    expect(root.commands).toMatchObject([
      {
        type: 'command',
        args: [
          {
            type: 'column',
            args: [
              {
                type: 'identifier',
                name: 'a',
              },
            ],
          },
          {
            type: 'column',
            args: [
              {
                type: 'identifier',
                name: 'b',
              },
              {
                type: 'identifier',
                name: 'c',
              },
            ],
          },
          {
            type: 'column',
            args: [
              {
                type: 'identifier',
                name: 'd',
              },
              {
                type: 'identifier',
                name: '👍',
              },
              {
                type: 'identifier',
                name: '123`123',
              },
            ],
          },
        ],
      },
    ]);
  });

  it('can mix quoted and un-quoted identifiers', () => {
    const text = 'ROW part1.part2.`part``3️⃣`';
    const { root } = parse(text);

    expect(root.commands).toMatchObject([
      {
        type: 'command',
        args: [
          {
            type: 'column',
            args: [
              {
                type: 'identifier',
                name: 'part1',
              },
              {
                type: 'identifier',
                name: 'part2',
              },
              {
                type: 'identifier',
                name: 'part`3️⃣',
              },
            ],
          },
        ],
      },
    ]);
  });

  it('in KEEP command', () => {
    const text = 'FROM a | KEEP a.b';
    const { root } = parse(text);

    expect(root.commands).toMatchObject([
      {},
      {
        type: 'command',
        args: [
          {
            type: 'column',
            args: [
              {
                type: 'identifier',
                name: 'a',
              },
              {
                type: 'identifier',
                name: 'b',
              },
            ],
          },
        ],
      },
    ]);
  });

  describe('params', () => {
    it('can parse named param as a single param node', () => {
      const text = 'ROW ?test';
      const { root } = parse(text);

      expect(root.commands).toMatchObject([
        {
          type: 'command',
          args: [
            {
              type: 'literal',
              literalType: 'param',
              paramType: 'named',
              value: 'test',
            },
          ],
        },
      ]);
    });

    it('can parse nested named params as column', () => {
      const text = 'ROW ?test1.?test2';
      const { root } = parse(text);

      expect(root.commands).toMatchObject([
        {
          type: 'command',
          args: [
            {
              type: 'column',
              args: [
                {
                  type: 'literal',
                  literalType: 'param',
                  paramType: 'named',
                  value: 'test1',
                },
                {
                  type: 'literal',
                  literalType: 'param',
                  paramType: 'named',
                  value: 'test2',
                },
              ],
            },
          ],
        },
      ]);
    });

    it('can mix param and identifier in column name', () => {
      const text = 'ROW ?par.id';
      const { root } = parse(text);

      expect(root.commands).toMatchObject([
        {
          type: 'command',
          args: [
            {
              type: 'column',
              args: [
                {
                  type: 'literal',
                  literalType: 'param',
                  paramType: 'named',
                  value: 'par',
                },
                {
                  type: 'identifier',
                  name: 'id',
                },
              ],
            },
          ],
        },
      ]);
    });

    it('can mix param and identifier in column name - 2', () => {
      const text = 'ROW `😱`.?par';
      const { root } = parse(text);

      expect(root.commands).toMatchObject([
        {
          type: 'command',
          args: [
            {
              type: 'column',
              args: [
                {
                  type: 'identifier',
                  name: '😱',
                },
                {
                  type: 'literal',
                  literalType: 'param',
                  paramType: 'named',
                  value: 'par',
                },
              ],
            },
          ],
        },
      ]);
    });

    it('supports all three different param types', () => {
      const text = 'ROW ?.?name.?123';
      const { root } = parse(text);

      expect(root.commands).toMatchObject([
        {
          type: 'command',
          args: [
            {
              type: 'column',
              args: [
                {
                  type: 'literal',
                  literalType: 'param',
                  paramType: 'unnamed',
                },
                {
                  type: 'literal',
                  literalType: 'param',
                  paramType: 'named',
                  value: 'name',
                },
                {
                  type: 'literal',
                  literalType: 'param',
                  paramType: 'positional',
                  value: 123,
                },
              ],
            },
          ],
        },
      ]);
    });

    it('parses DROP command args as "column" nodes', () => {
      const text = 'FROM index | DROP any#Char$Field';
      const { root } = parse(text);

      expect(root.commands).toMatchObject([
        { type: 'command' },
        {
          type: 'command',
          name: 'drop',
          args: [
            {
              type: 'column',
              name: 'any',
            },
          ],
        },
      ]);
    });
  });
});
