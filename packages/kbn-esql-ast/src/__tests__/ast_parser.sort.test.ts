/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAstAndSyntaxErrors as parse } from '../ast_parser';

describe('SORT', () => {
  describe('correctly formatted', () => {
    it('sorting order without modifiers', () => {
      const text = `FROM employees | SORT height`;
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'sort',
          args: [
            {
              type: 'column',
              name: 'height',
            },
          ],
        },
      ]);
    });

    it('sort expression is a function call', () => {
      const text = `from a_index | sort values(textField)`;
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'sort',
          args: [
            {
              type: 'function',
              name: 'values',
            },
          ],
        },
      ]);
    });

    it('with order modifier "DESC"', () => {
      const text = `
        FROM employees
        | SORT height DESC
        `;
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'sort',
          args: [
            {
              type: 'order',
              order: 'DESC',
              nulls: '',
              args: [
                {
                  type: 'column',
                  name: 'height',
                },
              ],
            },
          ],
        },
      ]);
    });

    it('with nulls modifier "NULLS LAST"', () => {
      const text = `
        FROM employees
        | SORT height NULLS LAST
        `;
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'sort',
          args: [
            {
              type: 'order',
              order: '',
              nulls: 'NULLS LAST',
              args: [
                {
                  type: 'column',
                  name: 'height',
                },
              ],
            },
          ],
        },
      ]);
    });

    it('can parse various sorting columns with options', () => {
      const text =
        'FROM a | SORT a, b ASC, c DESC, d NULLS FIRST, e NULLS LAST, f ASC NULLS FIRST, g DESC NULLS LAST';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {},
        {
          type: 'command',
          name: 'sort',
          args: [
            {
              type: 'column',
              name: 'a',
            },
            {
              order: 'ASC',
              nulls: '',
              args: [
                {
                  name: 'b',
                },
              ],
            },
            {
              order: 'DESC',
              nulls: '',
              args: [
                {
                  name: 'c',
                },
              ],
            },
            {
              order: '',
              nulls: 'NULLS FIRST',
              args: [
                {
                  name: 'd',
                },
              ],
            },
            {
              order: '',
              nulls: 'NULLS LAST',
              args: [
                {
                  name: 'e',
                },
              ],
            },
            {
              order: 'ASC',
              nulls: 'NULLS FIRST',
              args: [
                {
                  name: 'f',
                },
              ],
            },
            {
              order: 'DESC',
              nulls: 'NULLS LAST',
              args: [
                {
                  name: 'g',
                },
              ],
            },
          ],
        },
      ]);
    });
  });
});
