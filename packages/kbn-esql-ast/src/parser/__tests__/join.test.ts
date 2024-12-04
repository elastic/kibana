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

describe('<TYPE> JOIN command', () => {
  describe('correctly formatted', () => {
    it('can parse out JOIN command', () => {
      const text = `FROM employees | LOOKUP JOIN languages_lookup ON language_code`;
      const query = EsqlQuery.fromSrc(text);

      expect(query.ast.commands[1]).toMatchObject({
        type: 'command',
        name: 'join',
        commandType: 'lookup',
      });
    });

    it('supports all join types', () => {
      const assertJoinType = (type: string) => {
        const text = `FROM employees | ${type} JOIN languages_lookup ON language_code`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1]).toMatchObject({
          type: 'command',
          name: 'join',
          commandType: type.toLowerCase(),
        });
      };

      assertJoinType('LOOKUP');
      assertJoinType('LEFT');
      assertJoinType('RIGHT');
      expect(() => assertJoinType('HASH')).toThrow();
    });

    it('can parse out target identifier', () => {
      const text = `FROM employees | LOOKUP JOIN languages_lookup ON language_code`;
      const query = EsqlQuery.fromSrc(text);

      expect(query.ast.commands[1]).toMatchObject({
        commandType: 'lookup',
        args: [
          {
            type: 'identifier',
            name: 'languages_lookup',
          },
          {},
        ],
      });
    });

    it('can parse out target with "AS" alias expression', () => {
      const text = `FROM employees | LOOKUP JOIN languages_lookup AS ll ON language_code`;
      const query = EsqlQuery.fromSrc(text);

      expect(query.ast.commands[1]).toMatchObject({
        commandType: 'lookup',
        args: [
          {
            type: 'function',
            subtype: 'binary-expression',
            name: 'as',
            args: [
              {
                type: 'identifier',
                name: 'languages_lookup',
              },
              {
                type: 'identifier',
                name: 'll',
              },
            ],
          },
          {},
        ],
      });
    });

    it('can parse out a single "ON" predicate expression', () => {
      const text = `FROM employees | LOOKUP JOIN languages_lookup AS ll ON language_code`;
      const query = EsqlQuery.fromSrc(text);

      expect(query.ast.commands[1]).toMatchObject({
        commandType: 'lookup',
        args: [
          {},
          {
            type: 'option',
            name: 'on',
            args: [
              {
                type: 'column',
                name: 'language_code',
                args: [
                  {
                    type: 'identifier',
                    name: 'language_code',
                  },
                ],
              },
            ],
          },
        ],
      });
    });

    it('can parse out multiple "ON" predicate expressions', () => {
      const text = `FROM employees | LOOKUP JOIN languages_lookup AS ll ON a, b, c`;
      const query = EsqlQuery.fromSrc(text);

      expect(query.ast.commands[1]).toMatchObject({
        name: 'join',
        args: [
          {},
          {
            type: 'option',
            name: 'on',
            args: [
              {
                type: 'column',
                name: 'a',
              },
              {
                type: 'column',
                name: 'b',
              },
              {
                type: 'column',
                name: 'c',
              },
            ],
          },
        ],
      });
    });

    it('example from documentation', () => {
      const text = `
        FROM employees
          | EVAL language_code = languages
          | LOOKUP JOIN languages_lookup ON language_code
          | WHERE emp_no < 500
          | KEEP emp_no, language_name
          | SORT emp_no
          | LIMIT 10
      `;
      const query = EsqlQuery.fromSrc(text);

      expect(query.ast.commands[2]).toMatchObject({
        type: 'command',
        name: 'join',
        commandType: 'lookup',
        args: [
          {
            type: 'identifier',
            name: 'languages_lookup',
          },
          {
            type: 'option',
            name: 'on',
            args: [
              {
                type: 'column',
                name: 'language_code',
              },
            ],
          },
        ],
      });
    });

    it('correctly extracts node positions', () => {
      const text = `FROM employees | LOOKUP JOIN index AS alias ON on_1, on_2 | LIMIT 1`;
      const query = EsqlQuery.fromSrc(text);
      const node1 = Walker.match(query.ast, { type: 'identifier', name: 'index' });
      const node2 = Walker.match(query.ast, { type: 'identifier', name: 'alias' });
      const node3 = Walker.match(query.ast, { type: 'column', name: 'on_1' });
      const node4 = Walker.match(query.ast, { type: 'column', name: 'on_2' });

      expect(query.src.slice(node1?.location.min, node1?.location.max! + 1)).toBe('index');
      expect(query.src.slice(node2?.location.min, node2?.location.max! + 1)).toBe('alias');
      expect(query.src.slice(node3?.location.min, node3?.location.max! + 1)).toBe('on_1');
      expect(query.src.slice(node4?.location.min, node4?.location.max! + 1)).toBe('on_2');
    });
  });

  describe('incorrectly formatted', () => {
    const text = `FROM employees | LOOKUP JOIN index AAS alias ON on_1, on_2 | LIMIT 1`;
    const query = EsqlQuery.fromSrc(text);

    expect(query.errors.length > 0).toBe(true);
    expect(query.errors[0].message.includes('AAS')).toBe(true);
  });
});
