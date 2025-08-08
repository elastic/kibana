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

describe('DROP', () => {
  describe('correctly formatted', () => {
    it('parses basic example from documentation', () => {
      const src = `
        FROM employees
        | DROP height`;
      const { ast, errors } = EsqlQuery.fromSrc(src);
      const drop = Walker.match(ast, { type: 'command', name: 'drop' });

      expect(errors.length).toBe(0);
      expect(drop).toMatchObject({
        type: 'command',
        name: 'drop',
        args: [{}],
      });
    });

    it('parses multiple columns', () => {
      const src = `
        FROM employees
        | DROP emp_no, first_name, last_name, height`;
      const { ast, errors } = EsqlQuery.fromSrc(src);
      const drop = Walker.match(ast, { type: 'command', name: 'drop' });

      expect(errors.length).toBe(0);
      expect(drop).toMatchObject({
        type: 'command',
        name: 'drop',
        args: [{}, {}, {}, {}],
      });
    });

    it('parses double param as argument', () => {
      const src = `
        FROM employees
        | DROP ??drop`;
      const { ast, errors } = EsqlQuery.fromSrc(src);
      const drop = Walker.match(ast, { type: 'command', name: 'drop' });

      expect(errors.length).toBe(0);
      expect(drop).toMatchObject({
        type: 'command',
        name: 'drop',
        args: [
          {
            type: 'literal',
            literalType: 'param',
            paramType: 'named',
          },
        ],
      });
    });

    it('parses single param as argument', () => {
      const src = `
        FROM employees
        | DROP ?drop`;
      const { ast, errors } = EsqlQuery.fromSrc(src);
      const drop = Walker.match(ast, { type: 'command', name: 'drop' });

      expect(errors.length).toBe(0);
      expect(drop).toMatchObject({
        type: 'command',
        name: 'drop',
        args: [
          {
            type: 'literal',
            literalType: 'param',
            paramType: 'positional',
          },
        ],
      });
    });

    describe('wildcards and ordering', () => {
      it('parses single wildcard pattern', () => {
        const src = `
          FROM employees
          | DROP h*`;
        const { ast, errors } = EsqlQuery.fromSrc(src);
        const drop = Walker.match(ast, { type: 'command', name: 'drop' });

        expect(errors.length).toBe(0);
        expect(drop).toMatchObject({
          type: 'command',
          name: 'drop',
          args: [{}],
        });
      });

      it('parses wildcard pattern from documentation', () => {
        const src = `
          FROM employees
          | DROP height*`;
        const { ast, errors } = EsqlQuery.fromSrc(src);
        const drop = Walker.match(ast, { type: 'command', name: 'drop' });

        expect(errors.length).toBe(0);
        expect(drop).toMatchObject({
          type: 'command',
          name: 'drop',
          args: [{}],
        });
      });

      it('parses multiple wildcard patterns including *', () => {
        const src = `
          FROM employees
          | DROP h*, *`;
        const { ast, errors } = EsqlQuery.fromSrc(src);
        const drop = Walker.match(ast, { type: 'command', name: 'drop' });

        expect(errors.length).toBe(0);
        expect(drop).toMatchObject({
          type: 'command',
          name: 'drop',
          args: [{}, {}],
        });
      });

      it('drops explicit field names before wildcard with same prefix', () => {
        const src = `
          FROM employees
          | DROP first_name, last_name, first_name*`;
        const { ast, errors } = EsqlQuery.fromSrc(src);
        const drop = Walker.match(ast, { type: 'command', name: 'drop' });

        expect(errors.length).toBe(0);
        expect(drop).toMatchObject({
          type: 'command',
          name: 'drop',
          args: [{}, {}, {}],
        });
      });

      it('preserves source order of wildcard expressions with same precedence', () => {
        const src = `
          FROM employees
          | DROP first_name*, last_name, first_na*`;
        const { ast, errors } = EsqlQuery.fromSrc(src);
        const drop = Walker.match(ast, { type: 'command', name: 'drop' });

        expect(errors.length).toBe(0);
        expect(drop).toMatchObject({
          type: 'command',
          name: 'drop',
          args: [{}, {}, {}],
        });
      });

      it('parses * with later explicit column', () => {
        const src = `
          FROM employees
          | DROP *, first_name`;
        const { ast, errors } = EsqlQuery.fromSrc(src);
        const drop = Walker.match(ast, { type: 'command', name: 'drop' });

        expect(errors.length).toBe(0);
        expect(drop).toMatchObject({
          type: 'command',
          name: 'drop',
          args: [{}, {}],
        });
      });
    });
  });

  describe('invalid query', () => {
    it('no source command specified and no DROP args specified', () => {
      const src = `DROP`;
      const { errors } = EsqlQuery.fromSrc(src);

      expect(errors.length).toBe(1);
      expect(errors[0].message.startsWith('SyntaxError:')).toBe(true);
    });
  });
});
