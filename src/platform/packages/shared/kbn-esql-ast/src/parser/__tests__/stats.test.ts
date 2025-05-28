/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../query';
import { Walker } from '../../walker';

describe('STATS', () => {
  describe('correctly formatted', () => {
    it('a simple single aggregate expression', () => {
      const src = `
        FROM employees
          | STATS 123
          | WHERE still_hired == true
          `;
      const query = EsqlQuery.fromSrc(src);

      expect(query.errors.length).toBe(0);
      expect(query.ast.commands).toMatchObject([
        {},
        {
          type: 'command',
          name: 'stats',
          args: [
            {
              type: 'literal',
              name: '123',
            },
          ],
        },
        {},
      ]);
    });

    it("doesn't append an undefined arg with a trailing comma", () => {
      const src = `
      FROM employees
        | STATS 123 ,`;
      const query = EsqlQuery.fromSrc(src);

      expect(query.ast.commands[1].args).toHaveLength(1);
      expect(query.ast.commands[1].args.every((arg) => arg)).toBe(true);
    });

    it('aggregation function with escaped values', () => {
      const src = `
        FROM employees
          | STATS 123, agg("salary")
          | WHERE still_hired == true
          `;
      const query = EsqlQuery.fromSrc(src);

      expect(query.errors.length).toBe(0);
      expect(query.ast.commands).toMatchObject([
        {},
        {
          type: 'command',
          name: 'stats',
          args: [
            {
              type: 'literal',
              value: 123,
            },
            {
              type: 'function',
              name: 'agg',
            },
          ],
        },
        {},
      ]);
    });

    it('field column name defined', () => {
      const src = `
        FROM employees
          | STATS my_field = agg("salary")
          | WHERE still_hired == true
          `;
      const query = EsqlQuery.fromSrc(src);

      expect(query.errors.length).toBe(0);
      expect(query.ast.commands).toMatchObject([
        {},
        {
          type: 'command',
          name: 'stats',
          args: [
            {
              type: 'function',
              name: '=',
              args: [
                {
                  type: 'column',
                  args: [
                    {
                      type: 'identifier',
                      name: 'my_field',
                    },
                  ],
                },
                [
                  {
                    type: 'function',
                    name: 'agg',
                    args: [
                      {
                        type: 'literal',
                        valueUnquoted: 'salary',
                      },
                    ],
                  },
                ],
              ],
            },
          ],
        },
        {},
      ]);
    });

    it('parses BY clause', () => {
      const src = `
        FROM employees
          | STATS my_field = agg("salary") BY department
          | WHERE still_hired == true
          `;
      const query = EsqlQuery.fromSrc(src);

      expect(query.errors.length).toBe(0);
      expect(query.ast.commands).toMatchObject([
        {},
        {
          type: 'command',
          name: 'stats',
          args: [
            {},
            {
              type: 'option',
              name: 'by',
            },
          ],
        },
        {},
      ]);
    });

    describe('WHERE clause', () => {
      it('boolean expression wrapped in WHERE clause', () => {
        const src = `
          FROM employees
            | STATS 123 WHERE still_hired == true
            | LIMIT 1
            `;
        const query = EsqlQuery.fromSrc(src);

        // console.log(JSON.stringify(query.ast.commands, null, 2));

        expect(query.errors.length).toBe(0);
        expect(query.ast.commands).toMatchObject([
          {},
          {
            type: 'command',
            name: 'stats',
            args: [
              {
                type: 'function',
                subtype: 'binary-expression',
                name: 'where',
                args: [
                  {
                    type: 'literal',
                    name: '123',
                  },
                  {
                    type: 'function',
                    name: '==',
                    args: [
                      {
                        type: 'column',
                        args: [
                          {
                            type: 'identifier',
                            name: 'still_hired',
                          },
                        ],
                      },
                      {
                        type: 'literal',
                        value: 'true',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {},
        ]);
      });

      it('extracts WHERE position', () => {
        const src = `
          FROM employees
            | STATS 123 WHERE still_hired == true
            | LIMIT 1
            `;
        const query = EsqlQuery.fromSrc(src);
        const where = Walker.match(query.ast, {
          type: 'function',
          name: 'where',
        })!;
        const text = src.substring(where.location.min, where.location.max + 1);

        expect(text.trim()).toBe('123 WHERE still_hired == true');
      });

      it('WHERE clause around "agg" function', () => {
        const src = `
        FROM employees
          | STATS 123, agg("salary") WHERE 456, 789 
          | LIMIT 10
          `;
        const query = EsqlQuery.fromSrc(src);

        expect(query.errors.length).toBe(0);
        expect(query.ast.commands).toMatchObject([
          {},
          {
            type: 'command',
            name: 'stats',
            args: [
              {
                type: 'literal',
                value: 123,
              },
              {
                type: 'function',
                name: 'where',
                args: [
                  {
                    type: 'function',
                    name: 'agg',
                  },
                  {
                    type: 'literal',
                    value: 456,
                  },
                ],
              },
              {
                type: 'literal',
                value: 789,
              },
            ],
          },
          {},
        ]);
      });

      it('WHERE for field definition', () => {
        const src = `
          FROM employees
            | STATS my_field = agg("salary") WHERE 123, 456
            | WHERE still_hired == true
            `;
        const query = EsqlQuery.fromSrc(src);

        expect(query.errors.length).toBe(0);
        expect(query.ast.commands).toMatchObject([
          {},
          {
            type: 'command',
            name: 'stats',
            args: [
              {
                type: 'function',
                name: 'where',
                args: [
                  {
                    type: 'function',
                    name: '=',
                    args: [
                      {
                        type: 'column',
                        args: [
                          {
                            type: 'identifier',
                            name: 'my_field',
                          },
                        ],
                      },
                      [
                        {
                          type: 'function',
                          name: 'agg',
                          args: [
                            {
                              type: 'literal',
                              valueUnquoted: 'salary',
                            },
                          ],
                        },
                      ],
                    ],
                  },
                  {
                    type: 'literal',
                    value: 123,
                  },
                ],
              },
              {
                type: 'literal',
                value: 456,
              },
            ],
          },
          {},
        ]);
      });
    });
  });
});
