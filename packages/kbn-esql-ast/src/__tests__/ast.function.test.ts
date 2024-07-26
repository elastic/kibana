/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAstAndSyntaxErrors as parse } from '../ast_parser';

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

  describe('"binary-expression"', () => {
    it('arithmetic operations', () => {
      const ops = ['+', '-', '*', '/', '%'];

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
  });
});
