/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../composer/query';
import { Walker } from '../../ast/walker';

describe('KEEP', () => {
  describe('correctly formatted', () => {
    it('parses basic example from documentation', () => {
      const src = `
        FROM employees
        | KEEP emp_no, first_name, last_name, height`;
      const { ast, errors } = EsqlQuery.fromSrc(src);
      const keep = Walker.match(ast, { type: 'command', name: 'keep' });

      expect(errors.length).toBe(0);
      expect(keep).toMatchObject({
        type: 'command',
        name: 'keep',
        args: [{}, {}, {}, {}],
      });
    });

    it('parses double param as argument', () => {
      const src = `
        FROM employees
        | KEEP ??keep`;
      const { ast, errors } = EsqlQuery.fromSrc(src);
      const keep = Walker.match(ast, { type: 'command', name: 'keep' });

      expect(errors.length).toBe(0);
      expect(keep).toMatchObject({
        type: 'command',
        name: 'keep',
        args: [
          {
            type: 'literal',
            literalType: 'param',
            paramType: 'named',
            paramKind: '??',
            value: 'keep',
          },
        ],
      });
    });

    it('parses single param as argument', () => {
      const src = `
        FROM employees
        | KEEP ?keep`;
      const { ast, errors } = EsqlQuery.fromSrc(src);
      const keep = Walker.match(ast, { type: 'command', name: 'keep' });

      expect(errors.length).toBe(0);
      expect(keep).toMatchObject({
        type: 'command',
        name: 'keep',
        args: [
          {
            type: 'literal',
            literalType: 'param',
            paramType: 'named',
            paramKind: '?',
            value: 'keep',
          },
        ],
      });
    });

    describe('wildcards and ordering', () => {
      it('parses single wildcard pattern', () => {
        const src = `
          FROM employees
          | KEEP h*`;
        const { ast, errors } = EsqlQuery.fromSrc(src);
        const keep = Walker.match(ast, { type: 'command', name: 'keep' });

        expect(errors.length).toBe(0);
        expect(keep).toMatchObject({
          type: 'command',
          name: 'keep',
          args: [
            {
              type: 'column',
              name: 'h*',
            },
          ],
        });
      });

      it('parses multiple wildcard patterns including *', () => {
        const src = `
          FROM employees
          | KEEP h*, *`;
        const { ast, errors } = EsqlQuery.fromSrc(src);
        const keep = Walker.match(ast, { type: 'command', name: 'keep' });

        expect(errors.length).toBe(0);
        expect(keep).toMatchObject({
          type: 'command',
          name: 'keep',
          args: [
            {
              type: 'column',
              name: 'h*',
            },
            {
              type: 'column',
              name: '*',
            },
          ],
        });
      });

      it('keeps explicit field names before wildcard with same prefix', () => {
        const src = `
          FROM employees
          | KEEP first_name, last_name, first_name*`;
        const { ast, errors } = EsqlQuery.fromSrc(src);
        const keep = Walker.match(ast, { type: 'command', name: 'keep' });

        expect(errors.length).toBe(0);
        expect(keep).toMatchObject({
          type: 'command',
          name: 'keep',
          args: [
            {
              type: 'column',
              name: 'first_name',
            },
            {
              type: 'column',
              name: 'last_name',
            },
            {
              type: 'column',
              name: 'first_name*',
            },
          ],
        });
      });

      it('preserves source order of wildcard expressions with same precedence', () => {
        const src = `
          FROM employees
          | KEEP first_name*, last_name, first_na*`;
        const { ast, errors } = EsqlQuery.fromSrc(src);
        const keep = Walker.match(ast, { type: 'command', name: 'keep' });

        expect(errors.length).toBe(0);
        expect(keep).toMatchObject({
          type: 'command',
          name: 'keep',
          args: [
            {
              type: 'column',
              name: 'first_name*',
            },
            {
              type: 'column',
              name: 'last_name',
            },
            {
              type: 'column',
              name: 'first_na*',
            },
          ],
        });
      });

      it('parses * with later explicit column', () => {
        const src = `
          FROM employees
          | KEEP *, first_name`;
        const { ast, errors } = EsqlQuery.fromSrc(src);
        const keep = Walker.match(ast, { type: 'command', name: 'keep' });

        expect(errors.length).toBe(0);
        expect(keep).toMatchObject({
          type: 'command',
          name: 'keep',
          args: [
            {
              type: 'column',
              name: '*',
            },
            {
              type: 'column',
              name: 'first_name',
            },
          ],
        });
      });
    });
  });
});
