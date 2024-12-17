/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '..';
import { EsqlQuery } from '../../query';
import { Walker } from '../../walker';

describe('function AST nodes', () => {
  describe('"variadic-call"', () => {
    it('function call with a single argument', () => {
      const query = 'ROW fn(1)';
      const { ast, errors } = parse(query);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'row',
          args: [
            {
              type: 'function',
              name: 'fn',
              args: [
                {
                  type: 'literal',
                  value: 1,
                },
              ],
            },
          ],
        },
      ]);
    });

    it('function call with multiple argument', () => {
      const query = 'ROW fn(1, 2, 3)';
      const { ast, errors } = parse(query);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'row',
          args: [
            {
              type: 'function',
              name: 'fn',
              args: [
                {
                  type: 'literal',
                  value: 1,
                },
                {
                  type: 'literal',
                  value: 2,
                },
                {
                  type: 'literal',
                  value: 3,
                },
              ],
            },
          ],
        },
      ]);
    });

    it('parses out function name as identifier node', () => {
      const query = 'ROW fn(1, 2, 3)';
      const { ast, errors } = parse(query);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'row',
          args: [
            {
              type: 'function',
              name: 'fn',
              operator: {
                type: 'identifier',
                name: 'fn',
              },
            },
          ],
        },
      ]);
    });

    it('parses out function name as named param', () => {
      const query = 'ROW ?insert_here(1, 2, 3)';
      const { ast, errors } = parse(query);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'row',
          args: [
            {
              type: 'function',
              name: '?insert_here',
              operator: {
                type: 'literal',
                literalType: 'param',
                paramType: 'named',
                value: 'insert_here',
              },
            },
          ],
        },
      ]);
    });

    it('parses out function name as unnamed param', () => {
      const query = 'ROW ?(1, 2, 3)';
      const { ast, errors } = parse(query);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'row',
          args: [
            {
              type: 'function',
              name: '?',
              operator: {
                type: 'literal',
                literalType: 'param',
                paramType: 'unnamed',
              },
            },
          ],
        },
      ]);
    });

    it('parses out function name as positional param', () => {
      const query = 'ROW ?30035(1, 2, 3)';
      const { ast, errors } = parse(query);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'row',
          args: [
            {
              type: 'function',
              name: '?30035',
              operator: {
                type: 'literal',
                literalType: 'param',
                paramType: 'positional',
                value: 30035,
              },
            },
          ],
        },
      ]);
    });
  });

  describe('"unary-expression"', () => {
    it('logical NOT', () => {
      const query = 'FROM a | STATS NOT b';
      const { ast, errors } = parse(query);
      const fn = Walker.findFunction(ast, ({ name }) => name === 'not');

      expect(errors.length).toBe(0);
      expect(fn).toMatchObject({
        type: 'function',
        subtype: 'unary-expression',
        name: 'not',
        args: [expect.any(Object)],
      });
    });

    // Currently arithmetic unary expressions, like "-x", are transformed to
    // binary expressions: "-1 * x". Enable this test once unary expressions
    // are supported.
    it.skip('arithmetic', () => {
      const query = 'FROM a | STATS -a';
      const { ast, errors } = parse(query);
      const fn = Walker.findFunction(ast, ({ name }) => name === '*');

      expect(errors.length).toBe(0);
      expect(fn).toMatchObject({
        type: 'function',
        subtype: 'unary-expression',
        name: '-',
        args: [expect.any(Object)],
      });
    });
  });

  describe('"postfix-unary-expression"', () => {
    it('IS [NOT] NULL', () => {
      const query = 'FROM a | STATS a IS NOT NULL';
      const { ast, errors } = parse(query);
      const fn = Walker.findFunction(ast, ({ name }) => name === 'is not null');

      expect(errors.length).toBe(0);
      expect(fn).toMatchObject({
        type: 'function',
        subtype: 'postfix-unary-expression',
        name: 'is not null',
        args: [expect.any(Object)],
      });
    });
  });

  describe('"binary-expression"', () => {
    it('arithmetic and logical operations', () => {
      const ops = ['+', '-', '*', '/', '%', 'and', 'or', '>', '>=', '<', '<=', '==', '!='];

      for (const op of ops) {
        const query = `ROW 1 ${op} 2`;
        const { ast, errors } = parse(query);

        expect(errors.length).toBe(0);
        expect(ast).toMatchObject([
          {
            type: 'command',
            name: 'row',
            args: [
              {
                type: 'function',
                subtype: 'binary-expression',
                name: op,
                args: [
                  {
                    type: 'literal',
                    value: 1,
                  },
                  {
                    type: 'literal',
                    value: 2,
                  },
                ],
              },
            ],
          },
        ]);
      }
    });

    it('logical IN', () => {
      const query = 'FROM a | STATS a IN (1, 2, 3)';
      const { ast, errors } = parse(query);
      const fn = Walker.findFunction(ast, ({ name }) => name === 'in');

      expect(errors.length).toBe(0);
      expect(fn).toMatchObject({
        type: 'function',
        subtype: 'binary-expression',
        name: 'in',
        args: [expect.any(Object), expect.any(Object)],
      });
    });

    it('logical NOT IN', () => {
      const query = 'FROM a | STATS a NOT IN (1, 2, 3)';
      const { ast, errors } = parse(query);
      const fn = Walker.findFunction(ast, ({ name }) => name === 'not_in');

      expect(errors.length).toBe(0);
      expect(fn).toMatchObject({
        type: 'function',
        subtype: 'binary-expression',
        name: 'not_in',
        args: [expect.any(Object), expect.any(Object)],
      });
    });

    it('regex expression', () => {
      const query = 'FROM a | STATS a LIKE "adsf"';
      const { ast, errors } = parse(query);
      const fn = Walker.findFunction(ast, ({ name }) => name === 'like');

      expect(errors.length).toBe(0);
      expect(fn).toMatchObject({
        type: 'function',
        subtype: 'binary-expression',
        name: 'like',
        args: [expect.any(Object), expect.any(Object)],
      });
    });

    it('assignment in ENRICH .. WITH clause', () => {
      const query = 'FROM a | ENRICH b ON c WITH d = e';
      const { ast, errors } = parse(query);
      const fn = Walker.findFunction(ast, ({ name }) => name === '=');

      expect(errors.length).toBe(0);
      expect(fn).toMatchObject({
        type: 'function',
        subtype: 'binary-expression',
        name: '=',
        args: [expect.any(Object), expect.any(Object)],
      });
    });

    it('assignment in STATS', () => {
      const query = 'FROM a | STATS b = c';
      const { ast, errors } = parse(query);
      const fn = Walker.findFunction(ast, ({ name }) => name === '=');

      expect(errors.length).toBe(0);
      expect(fn).toMatchObject({
        type: 'function',
        subtype: 'binary-expression',
        name: '=',
        args: [expect.any(Object), expect.any(Object)],
      });
    });
  });
});

describe('location', () => {
  const getFunctionTexts = (src: string) => {
    const query = EsqlQuery.fromSrc(src);
    const functions = Walker.matchAll(query.ast, { type: 'function' });
    const texts: string[] = functions.map((fn) => {
      return [...src].slice(fn.location.min, fn.location.max + 1).join('');
    });

    return texts;
  };

  it('correctly cuts out function source texts', () => {
    const texts = getFunctionTexts(
      'FROM index | LIMIT 1 | STATS agg() | LIMIT 2 | STATS max(a, b, c), max2(d.e)'
    );

    expect(texts).toEqual(['agg()', 'max(a, b, c)', 'max2(d.e)']);
  });

  it('functions in binary expressions', () => {
    const texts = getFunctionTexts('FROM index | STATS foo = agg(f1) + agg(f2), a.b = agg(f3)');

    expect(texts).toEqual([
      'foo = agg(f1) + agg(f2)',
      'agg(f1) + agg(f2)',
      'agg(f1)',
      'agg(f2)',
      'a.b = agg(f3)',
      'agg(f3)',
    ]);
  });

  it('with the simplest comment after function name identifier', () => {
    const texts1 = getFunctionTexts('FROM index | STATS agg/* */(1)');
    expect(texts1).toEqual(['agg/* */(1)']);

    const texts2 = getFunctionTexts('FROM index | STATS agg/* A */(a)');
    expect(texts2).toEqual(['agg/* A */(a)']);

    const texts3 = getFunctionTexts('FROM index | STATS agg /* A */ (*)');
    expect(texts3).toEqual(['agg /* A */ (*)']);
  });

  it('with the simplest emoji comment after function name identifier', () => {
    const texts = getFunctionTexts('FROM index | STATS agg/* 😎 */(*)');
    expect(texts).toEqual(['agg/* 😎 */(*)']);
  });

  it('with the simplest emoji comment after function name identifier, followed by another arg', () => {
    const texts = getFunctionTexts('FROM index | STATS agg/* 😎 */(*), abc');
    expect(texts).toEqual(['agg/* 😎 */(*)']);
  });

  it('simple emoji comment twice', () => {
    const texts = getFunctionTexts('FROM index | STATS agg/* 😎 */(*), max/* 😎 */(*)');
    expect(texts).toEqual(['agg/* 😎 */(*)', 'max/* 😎 */(*)']);
  });

  it('with comment and emoji after function name identifier', () => {
    const texts = getFunctionTexts('FROM index | STATS agg /* haha 😅 */ (*)');

    expect(texts).toEqual(['agg /* haha 😅 */ (*)']);
  });

  it('with comment inside argument list', () => {
    const texts = getFunctionTexts('FROM index | STATS agg  ( /* haha 😅 */ )');

    expect(texts).toEqual(['agg  ( /* haha 😅 */ )']);
  });

  it('with emoji and comment in argument lists', () => {
    const texts = getFunctionTexts(
      'FROM index | STATS agg( /* haha 😅 */ max(foo), bar, baz), test( /* asdf */ * /* asdf */)'
    );

    expect(texts).toEqual([
      'agg( /* haha 😅 */ max(foo), bar, baz)',
      'max(foo)',
      'test( /* asdf */ * /* asdf */)',
    ]);
  });
});
