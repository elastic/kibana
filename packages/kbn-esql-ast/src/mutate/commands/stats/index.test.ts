/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as commands from '..';
import { EsqlQuery } from '../../../query';

describe('commands.stats', () => {
  describe('.list()', () => {
    it('lists all "STATS" commands', () => {
      const src = 'FROM index | LIMIT 1 | STATS agg() | LIMIT 2 | STATS max()';
      const query = EsqlQuery.fromSrc(src);

      const nodes = [...commands.stats.list(query.ast)];

      expect(nodes).toMatchObject([
        {
          type: 'command',
          name: 'stats',
          args: [
            {
              type: 'function',
              name: 'agg',
            },
          ],
        },
        {
          type: 'command',
          name: 'stats',
          args: [
            {
              type: 'function',
              name: 'max',
            },
          ],
        },
      ]);
    });
  });

  describe('.byIndex()', () => {
    it('retrieves the specific "STATS" command by index', () => {
      const src = 'FROM index | LIMIT 1 | STATS agg() | LIMIT 2 | STATS max()';
      const query = EsqlQuery.fromSrc(src);

      const node1 = commands.stats.byIndex(query.ast, 1);
      const node2 = commands.stats.byIndex(query.ast, 0);

      expect(node1).toMatchObject({
        type: 'command',
        name: 'stats',
        args: [
          {
            type: 'function',
            name: 'max',
          },
        ],
      });
      expect(node2).toMatchObject({
        type: 'command',
        name: 'stats',
        args: [
          {
            type: 'function',
            name: 'agg',
          },
        ],
      });
    });
  });

  describe('.summarizeCommand()', () => {
    it('returns summary of a simple field, defined through assignment', () => {
      const src = 'FROM index | STATS foo = agg(bar)';
      const query = EsqlQuery.fromSrc(src);

      const command = commands.stats.byIndex(query.ast, 0)!;
      const summary = commands.stats.summarizeCommand(query, command);

      expect(summary).toMatchObject({
        command,
        aggregates: {
          foo: {
            arg: {
              type: 'function',
              name: '=',
            },
            field: 'foo',
            column: {
              type: 'column',
              name: 'foo',
            },
            definition: {
              type: 'function',
              name: 'agg',
              args: [
                {
                  type: 'column',
                  name: 'bar',
                },
              ],
            },
            terminals: [
              {
                type: 'column',
                name: 'bar',
              },
            ],
            fields: ['bar'],
          },
        },
      });
    });

    it('can summarize field defined without assignment', () => {
      const src = 'FROM index | STATS agg( /* haha 😅 */ max(foo), bar, baz)';
      const query = EsqlQuery.fromSrc(src);

      const command = commands.stats.byIndex(query.ast, 0)!;
      const summary = commands.stats.summarizeCommand(query, command);

      expect(summary).toMatchObject({
        command,
        aggregates: {
          '`agg( /* haha 😅 */ max(foo), bar, baz)`': {
            arg: {
              type: 'function',
              name: 'agg',
            },
            field: '`agg( /* haha 😅 */ max(foo), bar, baz)`',
            column: {
              type: 'column',
              name: 'agg( /* haha 😅 */ max(foo), bar, baz)',
            },
            definition: {
              type: 'function',
              name: 'agg',
            },
            terminals: [
              {
                type: 'column',
                name: 'foo',
              },
              {
                type: 'column',
                name: 'bar',
              },
              {
                type: 'column',
                name: 'baz',
              },
            ],
            fields: ['foo', 'bar', 'baz'],
          },
        },
      });
    });

    it('returns a map of stats about two fields', () => {
      const src = 'FROM index | STATS foo = agg(f1) + agg(f2), a.b = agg(f3)';
      const query = EsqlQuery.fromSrc(src);

      const command = commands.stats.byIndex(query.ast, 0)!;
      const summary = commands.stats.summarizeCommand(query, command);

      expect(summary).toMatchObject({
        aggregates: {
          foo: {
            field: 'foo',
            fields: ['f1', 'f2'],
          },
          'a.b': {
            field: 'a.b',
            fields: ['f3'],
          },
        },
      });
      expect(summary.fields).toEqual(new Set(['f1', 'f2', 'f3']));
    });

    it('can get de-duplicated list of used fields', () => {
      const src = 'FROM index | STATS foo = agg(f1) + agg(f2), a.b = agg(f1)';
      const query = EsqlQuery.fromSrc(src);

      const command = commands.stats.byIndex(query.ast, 0)!;
      const summary = commands.stats.summarizeCommand(query, command);

      expect(summary.fields).toEqual(new Set(['f1', 'f2']));
    });

    describe('params', () => {
      it('can use params as source field names', () => {
        const src = 'FROM index | STATS foo = agg(f1.?aha) + agg(?nested.?param), a.b = agg(f1)';
        const query = EsqlQuery.fromSrc(src);

        const command = commands.stats.byIndex(query.ast, 0)!;
        const summary = commands.stats.summarizeCommand(query, command);

        expect(summary).toMatchObject({
          aggregates: {
            foo: {
              fields: ['f1.?aha', '?nested.?param'],
            },
            'a.b': {
              fields: ['f1'],
            },
          },
        });
        expect(summary.fields).toEqual(new Set(['f1.?aha', '?nested.?param', 'f2']));
      });
    });

    it.todo('BY fields');
  });

  describe('.summarize()', () => {
    it('can summarize multiple stats commands', () => {
      const src = 'FROM index | LIMIT 1 | STATS agg() | LIMIT 2 | STATS max(a, b, c), max2(d.e)';
      const query = EsqlQuery.fromSrc(src);
      const summary = commands.stats.summarize(query);

      expect(summary).toMatchObject([
        {
          aggregates: {
            '`agg()`': {
              field: '`agg()`',
              fields: [],
            },
          },
          fields: new Set([]),
        },
        {
          aggregates: {
            '`max(a, b, c)`': {
              field: '`max(a, b, c)`',
              fields: ['a', 'b', 'c'],
            },
            '`max2(d.e)`': {
              field: '`max2(d.e)`',
              fields: ['d.e'],
            },
          },
          fields: new Set(['a', 'b', 'c', 'd.e']),
        },
      ]);
    });
  });
});
