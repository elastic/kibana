/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '..';
import { EsqlQuery } from '../../composer/query';
import type { ESQLColumn, ESQLCommand, ESQLFunction, ESQLInlineCast } from '../../types';
import { Walker } from '../../ast/walker';

describe('WHERE', () => {
  describe('correctly formatted', () => {
    it('example from documentation', () => {
      const text = `
        FROM employees
        | KEEP first_name, last_name, still_hired
        | WHERE still_hired == true
        `;
      const { ast, errors } = EsqlQuery.fromSrc(text);
      const where = Walker.match(ast, { type: 'command', name: 'where' });

      expect(errors.length).toBe(0);
      expect(where).toMatchObject({
        type: 'command',
        name: 'where',
        args: [
          {
            type: 'function',
            name: '==',
          },
        ],
      });
    });

    describe('match expression', () => {
      it('simple column name', () => {
        const text = `FROM index | WHERE abc`;
        const { root } = parse(text);

        expect(root.commands[1]).toMatchObject({
          type: 'command',
          name: 'where',
          args: [
            {
              type: 'column',
              name: 'abc',
            },
          ],
        });
      });

      it('simple column with match expression', () => {
        const text = `FROM index | WHERE abc : 123`;
        const { root } = parse(text);

        expect(root.commands[1]).toMatchObject({
          type: 'command',
          name: 'where',
          args: [
            {
              type: 'function',
              subtype: 'binary-expression',
              name: ':',
              args: [
                {
                  type: 'column',
                  name: 'abc',
                },
                {
                  type: 'literal',
                  literalType: 'integer',
                  value: 123,
                },
              ],
            },
          ],
        });
      });

      it('correctly reports match expression location', () => {
        const text = `FROM index | WHERE abc /*a*/ :  /*a*/  123`;
        const { root } = parse(text);
        const expression = root.commands[1].args[0] as ESQLFunction;

        expect(expression.name).toBe(':');
        expect(text.slice(expression.location.min, expression.location.max + 1)).toBe(
          'abc /*a*/ :  /*a*/  123'
        );
      });

      it('simple column with match expression and inline cast', () => {
        const text = `FROM index | WHERE abc :: INTEGER : 123`;
        const { root } = parse(text);

        expect(root.commands[1]).toMatchObject({
          type: 'command',
          name: 'where',
          args: [
            {
              type: 'function',
              subtype: 'binary-expression',
              name: ':',
              args: [
                {
                  type: 'inlineCast',
                  castType: 'integer',
                  value: {
                    type: 'column',
                    name: 'abc',
                  },
                },
                {
                  type: 'literal',
                  literalType: 'integer',
                  value: 123,
                },
              ],
            },
          ],
        });
      });

      it('correctly reports match expression with inline cast location', () => {
        const text = `FROM index | WHERE abc /*a*/ ::  /*a*/ INTEGER :  123`;
        const { root } = parse(text);
        const command = root.commands[1] as ESQLCommand;
        const match = command.args[0] as ESQLFunction;
        const cast = match.args[0] as ESQLInlineCast;
        const column = cast.value as ESQLColumn;

        expect(text.slice(command.location.min, command.location.max + 1)).toBe(
          'WHERE abc /*a*/ ::  /*a*/ INTEGER :  123'
        );
        expect(text.slice(match.location.min, match.location.max + 1)).toBe(
          'abc /*a*/ ::  /*a*/ INTEGER :  123'
        );
        expect(text.slice(cast.location.min, cast.location.max + 1)).toBe(
          'abc /*a*/ ::  /*a*/ INTEGER'
        );
        expect(text.slice(column.location.min, column.location.max + 1)).toBe('abc');
      });
    });
  });
});
