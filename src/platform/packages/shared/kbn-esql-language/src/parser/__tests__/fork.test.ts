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
import type { ESQLForkParens } from '../../types';
import { Walker } from '../../ast/walker';

describe('FORK', () => {
  describe('correctly formatted', () => {
    it('can parse single-command FORK query', () => {
      const text = `FROM kibana_ecommerce_data
| FORK
    (WHERE bytes > 1)
    (SORT bytes ASC)
    (LIMIT 100)`;
      const { ast } = parse(text);

      expect(ast[1].args).toHaveLength(3);
      expect(ast[1].args).toMatchObject([
        { type: 'parens', child: { type: 'query', commands: [{ name: 'where' }] } },
        { type: 'parens', child: { type: 'query', commands: [{ name: 'sort' }] } },
        { type: 'parens', child: { type: 'query', commands: [{ name: 'limit' }] } },
      ]);
    });

    it('correctly computes `location` fields', () => {
      const text = `
        FROM kibana_ecommerce_data
          | FORK (WHERE bytes > 1 | LIMIT 10) (SORT bytes ASC) (LIMIT 100)`;
      const { ast } = EsqlQuery.fromSrc(text);
      const fork = Walker.match(ast, { type: 'command', name: 'fork' })!;
      const firstParens = Walker.match(fork, { type: 'parens' })!;

      expect(text.slice(fork.location.min, fork.location.max + 1)).toBe(
        'FORK (WHERE bytes > 1 | LIMIT 10) (SORT bytes ASC) (LIMIT 100)'
      );
      expect(text.slice(firstParens.location.min, firstParens.location.max + 1)).toBe(
        '(WHERE bytes > 1 | LIMIT 10)'
      );
    });

    it('can parse composite-command FORK query (multiple commmands piped)', () => {
      const text = `FROM kibana_ecommerce_data
| FORK
    (WHERE bytes > 1 | SORT bytes ASC | LIMIT 1)
    (WHERE extension.keyword == "txt" | LIMIT 100)`;
      const { ast } = parse(text);

      expect(ast[1].args).toHaveLength(2);
      expect(ast[1].args).toMatchObject([
        {
          type: 'parens',
          child: {
            type: 'query',
            commands: [{ name: 'where' }, { name: 'sort' }, { name: 'limit' }],
          },
        },
        {
          type: 'parens',
          child: { type: 'query', commands: [{ name: 'where' }, { name: 'limit' }] },
        },
      ]);
    });
  });

  describe('FORK subcommand types', () => {
    const testCases = [
      { type: 'where', query: '(WHERE bytes > 1)' },
      { type: 'sort', query: '(SORT bytes ASC)' },
      { type: 'limit', query: '(LIMIT 100)' },
      { type: 'stats', query: '(STATS AVG(bytes))' },
      { type: 'dissect', query: '(DISSECT event.dataset "%{firstWord}")' },
      { type: 'eval', query: '(EVAL FLOOR(1.2))' },
    ];

    it.each(testCases)('checks FORK contains $type command', ({ type, query }) => {
      const text = `FROM kibana_ecommerce_data
| FORK
    ${query}`;
      const { root } = parse(text);

      expect(root.commands[1].args).toHaveLength(1);
      const parens = root.commands[1].args[0] as ESQLForkParens;

      expect(parens.type).toBe('parens');
      expect(parens.child.type).toBe('query');
      expect(parens.child.commands[0]).toMatchObject({
        name: type,
      });
    });
  });

  describe('when incorrectly formatted, returns errors', () => {
    it('when no pipe', () => {
      const text = `FROM kibana_ecommerce_data
| FORK
    (WHERE bytes > 1 LIMIT 1)`;

      const { errors } = parse(text);

      expect(errors.length > 0).toBe(true);
    });

    it('when bad parens', () => {
      const text = `FROM kibana_ecommerce_data
| FORK
    WHERE bytes > 1)`;

      const { errors } = parse(text);

      expect(errors.length > 0).toBe(true);
    });
  });
});
