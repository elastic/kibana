/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAstAndSyntaxErrors as parse } from '../ast_parser';
import { Walker } from '../walker';

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
