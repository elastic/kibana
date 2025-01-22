/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../query';

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
              type: 'field',
              column: {
                type: 'column',
                args: [
                  {
                    type: 'identifier',
                    name: '123',
                  },
                ],
              },
              value: {
                type: 'literal',
                value: 123,
              },
            },
          ],
        },
        {},
      ]);
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
              type: 'field',
              column: {
                type: 'column',
                args: [
                  {
                    type: 'identifier',
                    name: '123',
                  },
                ],
              },
              value: {
                type: 'literal',
                value: 123,
              },
            },
            {
              type: 'field',
              column: {
                type: 'column',
                args: [
                  {
                    type: 'identifier',
                    name: 'agg("salary")',
                  },
                ],
              },
              value: {
                type: 'function',
                name: 'agg',
              },
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
              type: 'field',
              column: {
                type: 'column',
                args: [
                  {
                    type: 'identifier',
                    name: 'my_field',
                  },
                ],
              },
              value: {
                type: 'function',
                name: 'agg',
              },
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
  });
});
