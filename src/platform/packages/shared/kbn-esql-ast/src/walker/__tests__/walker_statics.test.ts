/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '../../parser';
import { EsqlQuery } from '../../query';
import { ESQLAstRerankCommand } from '../../types';
import { Walker } from '../walker';

describe('Walker static methods', () => {
  describe('Walker.commands()', () => {
    test('can collect all commands', () => {
      const { ast } = parse(
        'FROM index | STATS a = 123 | WHERE 123 | LIMIT 10 | RERANK "query" ON field WITH id'
      );
      const commands = Walker.commands(ast);

      expect(commands.map(({ name }) => name).sort()).toStrictEqual([
        'from',
        'limit',
        'rerank',
        'stats',
        'where',
      ]);
    });
  });

  describe('Walker.params()', () => {
    test('can collect all params', () => {
      const query = 'ROW x = ?';
      const { ast } = parse(query);
      const params = Walker.params(ast);

      expect(params).toMatchObject([
        {
          type: 'literal',
          literalType: 'param',
          paramType: 'unnamed',
        },
      ]);
    });

    test('can collect all params from grouping functions', () => {
      const query =
        'ROW x=1, time=2024-07-10 | stats z = avg(x) by bucket(time, 20, ?_tstart,?_tend)';
      const { ast } = parse(query);
      const params = Walker.params(ast);

      expect(params).toMatchObject([
        {
          type: 'literal',
          literalType: 'param',
          paramType: 'named',
          value: '_tstart',
        },
        {
          type: 'literal',
          literalType: 'param',
          paramType: 'named',
          value: '_tend',
        },
      ]);
    });

    test('can collect params from column names', () => {
      const query = 'ROW ?a.?b';
      const { ast } = parse(query);
      const params = Walker.params(ast);

      expect(params).toMatchObject([
        {
          type: 'literal',
          literalType: 'param',
          paramType: 'named',
          value: 'a',
        },
        {
          type: 'literal',
          literalType: 'param',
          paramType: 'named',
          value: 'b',
        },
      ]);
    });

    test('can collect params from column names, where first part is not a param', () => {
      const query = 'ROW a.?b';
      const { ast } = parse(query);
      const params = Walker.params(ast);

      expect(params).toMatchObject([
        {
          type: 'literal',
          literalType: 'param',
          paramType: 'named',
          value: 'b',
        },
      ]);
    });

    test('can collect all types of param from column name', () => {
      const query = 'ROW ?.?0.?a';
      const { ast } = parse(query);
      const params = Walker.params(ast);

      expect(params).toMatchObject([
        {
          type: 'literal',
          literalType: 'param',
          paramType: 'unnamed',
        },
        {
          type: 'literal',
          literalType: 'param',
          paramType: 'positional',
          value: 0,
        },
        {
          type: 'literal',
          literalType: 'param',
          paramType: 'named',
          value: 'a',
        },
      ]);
    });

    test('can collect params from function names', () => {
      const query = 'FROM a | STATS ?lala()';
      const { ast } = parse(query);
      const params = Walker.params(ast);

      expect(params).toMatchObject([
        {
          type: 'literal',
          literalType: 'param',
          paramType: 'named',
          value: 'lala',
        },
      ]);
    });

    test('can collect params from function names (unnamed)', () => {
      const query = 'FROM a | STATS ?()';
      const { ast } = parse(query);
      const params = Walker.params(ast);

      expect(params).toMatchObject([
        {
          type: 'literal',
          literalType: 'param',
          paramType: 'unnamed',
        },
      ]);
    });

    test('can collect params from function names (positional)', () => {
      const query = 'FROM a | STATS agg(test), ?123()';
      const { ast } = parse(query);
      const params = Walker.params(ast);

      expect(params).toMatchObject([
        {
          type: 'literal',
          literalType: 'param',
          paramType: 'positional',
          value: 123,
        },
      ]);
    });
  });

  describe('Walker.find()', () => {
    test('can find a bucket() function', () => {
      const query = 'FROM b | STATS var0 = bucket(bytes, 1 hour), fn(1), fn(2), agg(true)';
      const fn = Walker.find(
        parse(query).ast!,
        (node) => node.type === 'function' && node.name === 'bucket'
      );

      expect(fn).toMatchObject({
        type: 'function',
        name: 'bucket',
      });
    });

    /**
     * @todo Tests skipped, while RERANK command grammar is being stabilized. We will
     * get back to it after 9.1 release.
     */
    test.skip('can find RERANK command by inference ID', () => {
      const query =
        'FROM b | RERANK "query" ON field WITH abc | RERANK "query" ON field WITH my_id | LIMIT 10';
      const command = Walker.find(parse(query).root, (node) => {
        if (node.type === 'command' && node.name === 'rerank') {
          const cmd = node as ESQLAstRerankCommand;
          if (cmd.inferenceId.name === 'my_id') {
            return true;
          }
        }
        return false;
      });

      expect(command).toMatchObject({
        type: 'command',
        name: 'rerank',
        inferenceId: {
          type: 'identifier',
          name: 'my_id',
        },
      });
    });

    test('finds the first "fn" function', () => {
      const query = 'FROM b | STATS var0 = bucket(bytes, 1 hour), fn(1), fn(2), agg(true)';
      const fn = Walker.find(
        parse(query).ast!,
        (node) => node.type === 'function' && node.name === 'fn'
      );

      expect(fn).toMatchObject({
        type: 'function',
        name: 'fn',
        args: [
          {
            type: 'literal',
            value: 1,
          },
        ],
      });
    });
  });

  describe('Walker.findAll()', () => {
    test('find all "fn" functions', () => {
      const query = 'FROM b | STATS var0 = bucket(bytes, 1 hour), fn(1), fn(2), agg(true)';
      const list = Walker.findAll(
        parse(query).ast!,
        (node) => node.type === 'function' && node.name === 'fn'
      );

      expect(list).toMatchObject([
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
        {
          type: 'function',
          name: 'fn',
          args: [
            {
              type: 'literal',
              value: 2,
            },
          ],
        },
      ]);
    });
  });

  describe('Walker.match()', () => {
    test('can find a bucket() function', () => {
      const query = 'FROM b | STATS var0 = bucket(bytes, 1 hour), fn(1), fn(2), agg(true)';
      const fn = Walker.match(parse(query).ast!, {
        type: 'function',
        name: 'bucket',
      });

      expect(fn).toMatchObject({
        type: 'function',
        name: 'bucket',
      });
    });

    test('finds the first "fn" function', () => {
      const query = 'FROM b | STATS var0 = bucket(bytes, 1 hour), fn(1), fn(2), agg(true)';
      const fn = Walker.match(parse(query).ast!, { type: 'function', name: 'fn' });

      expect(fn).toMatchObject({
        type: 'function',
        name: 'fn',
        args: [
          {
            type: 'literal',
            value: 1,
          },
        ],
      });
    });

    test('can find a deeply nested column', () => {
      const query =
        'FROM index | WHERE 123 == add(1 + fn(NOT 10 + -(a.b.c::ip)::INTEGER /* comment */))';
      const { root } = parse(query);
      const res = Walker.match(root, {
        type: 'column',
        name: 'a.b.c',
      });

      expect(res).toMatchObject({
        type: 'column',
        name: 'a.b.c',
      });
    });

    test('can find WHERE command by its type', () => {
      const query = 'FROM index | LEFT JOIN a | RIGHT JOIN b';
      const { root } = parse(query);

      const join1 = Walker.match(root, {
        type: 'command',
        name: 'join',
        commandType: 'left',
      })!;
      const source1 = Walker.match(join1, {
        type: 'source',
        name: 'a',
      })!;
      const join2 = Walker.match(root, {
        type: 'command',
        name: 'join',
        commandType: 'right',
      })!;
      const source2 = Walker.match(join2, {
        type: 'source',
        name: 'b',
      })!;

      expect(source1).toMatchObject({
        name: 'a',
      });
      expect(source2).toMatchObject({
        name: 'b',
      });
    });
  });

  describe('Walker.matchAll()', () => {
    test('find all "fn" functions', () => {
      const query = 'FROM b | STATS var0 = bucket(bytes, 1 hour), fn(1), fn(2), agg(true)';
      const list = Walker.matchAll(parse(query).ast!, {
        type: 'function',
        name: 'fn',
      });

      expect(list).toMatchObject([
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
        {
          type: 'function',
          name: 'fn',
          args: [
            {
              type: 'literal',
              value: 2,
            },
          ],
        },
      ]);
    });

    test('find all "fn" and "agg" functions', () => {
      const query = 'FROM b | STATS var0 = bucket(bytes, 1 hour), fn(1), fn(2), agg(true)';
      const list = Walker.matchAll(parse(query).ast!, {
        type: 'function',
        name: ['fn', 'agg'],
      });

      expect(list).toMatchObject([
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
        {
          type: 'function',
          name: 'fn',
          args: [
            {
              type: 'literal',
              value: 2,
            },
          ],
        },
        {
          type: 'function',
          name: 'agg',
        },
      ]);
    });

    test('find all functions which start with "b" or "a"', () => {
      const query = 'FROM b | STATS var0 = bucket(bytes, 1 hour), fn(1), fn(2), agg(true)';
      const list = Walker.matchAll(parse(query).ast!, {
        type: 'function',
        name: /^a|b/i,
      });

      expect(list).toMatchObject([
        {
          type: 'function',
          name: 'bucket',
        },
        {
          type: 'function',
          name: 'agg',
        },
      ]);
    });
  });

  describe('Walker.findFunction()', () => {
    test('can find a function by name', () => {
      const query1 = 'FROM a | STATS bucket(bytes, 1 hour)';
      const query2 = 'FROM b | STATS var0 == bucket(bytes, 1 hour)';
      const has1 = Walker.hasFunction(parse(query1).ast!, '==');
      const has2 = Walker.hasFunction(parse(query2).ast!, '==');

      expect(has1).toBe(false);
      expect(has2).toBe(true);
    });
  });

  describe('Walker.hasFunction()', () => {
    test('can find binary expression expression', () => {
      const query1 = 'FROM a | STATS a(b(1), c(2), d(3))';
      const { ast } = EsqlQuery.fromSrc(query1);
      const fn1 = Walker.findFunction(ast, 'a');
      const fn2 = Walker.findFunction(ast, 'b');
      const fn3 = Walker.findFunction(ast, 'c');
      const fn4 = Walker.findFunction(ast, 'd');

      expect(fn1).toMatchObject({ type: 'function', name: 'a' });
      expect(fn2).toMatchObject({ type: 'function', name: 'b' });
      expect(fn3).toMatchObject({ type: 'function', name: 'c' });
      expect(fn4).toMatchObject({ type: 'function', name: 'd' });
    });
  });

  describe('Walker.parent()', () => {
    test('can find parent node (FROM command) of a source', () => {
      const { ast } = EsqlQuery.fromSrc('FROM index');
      const child = Walker.match(ast, { type: 'source' })!;
      const parent = Walker.parent(ast, child)!;
      const grandParent = Walker.parent(ast, parent);

      expect(child).toMatchObject({
        type: 'source',
        name: 'index',
      });
      expect(parent).toMatchObject({
        type: 'command',
        name: 'from',
      });
      expect(grandParent).toMatchObject({
        type: 'query',
      });
    });
  });

  describe('Walker.parents()', () => {
    test('can find all parents of a source', () => {
      const { ast } = EsqlQuery.fromSrc('FROM index');
      const child = Walker.match(ast, { type: 'source' })!;
      const ancestry = Walker.parents(ast, child);

      expect(ancestry).toMatchObject([
        {
          type: 'command',
          name: 'from',
        },
        {
          type: 'query',
        },
      ]);
    });

    test('can find all parents of a nested function', () => {
      const { ast } = EsqlQuery.fromSrc('FROM index | STATS a = agg(1 - b(3 + c(4)))');
      const four = Walker.match(ast, { type: 'literal', value: 4 })!;
      const ancestry = Walker.parents(ast, four);

      expect(ancestry).toMatchObject([
        {
          type: 'function',
          name: 'c',
        },
        {
          type: 'function',
          name: '+',
        },
        {
          type: 'function',
          name: 'b',
        },
        {
          type: 'function',
          name: '-',
        },
        {
          type: 'function',
          name: 'agg',
        },
        {
          type: 'function',
          name: '=',
        },
        {
          type: 'command',
          name: 'stats',
        },
        {
          type: 'query',
        },
      ]);
    });
  });
});
