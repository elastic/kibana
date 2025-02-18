/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '../../../parser';
import { BasicPrettyPrinter } from '../../../pretty_print';
import * as commands from '..';

describe('commands.limit', () => {
  describe('.list()', () => {
    it('lists all "LIMIT" commands', () => {
      const src = 'FROM index | LIMIT 1 | STATS agg() | LIMIT 2 | WHERE a == b | LIMIT 3';
      const { root } = parse(src);

      const nodes = [...commands.limit.list(root)];

      expect(nodes).toMatchObject([
        {
          type: 'command',
          name: 'limit',
          args: [
            {
              type: 'literal',
              value: 1,
            },
          ],
        },
        {
          type: 'command',
          name: 'limit',
          args: [
            {
              type: 'literal',
              value: 2,
            },
          ],
        },
        {
          type: 'command',
          name: 'limit',
          args: [
            {
              type: 'literal',
              value: 3,
            },
          ],
        },
      ]);
    });
  });

  describe('.byIndex()', () => {
    it('retrieves the specific "LIMIT" command by index', () => {
      const src = 'FROM index | LIMIT 1 | STATS agg() | LIMIT 2 | WHERE a == b | LIMIT 3';
      const { root } = parse(src);

      const node = commands.limit.byIndex(root, 1);

      expect(node).toMatchObject({
        type: 'command',
        name: 'limit',
        args: [
          {
            type: 'literal',
            value: 2,
          },
        ],
      });
    });
  });

  describe('.find()', () => {
    it('can find a limit command by predicate', () => {
      const src = 'FROM index | LIMIT 1 | STATS agg() | LIMIT 2 | WHERE a == b | LIMIT 3';
      const { root } = parse(src);

      const node = commands.limit.find(root, (cmd) => (cmd.args?.[0] as any).value === 3);

      expect(node).toMatchObject({
        type: 'command',
        name: 'limit',
        args: [
          {
            type: 'literal',
            value: 3,
          },
        ],
      });
    });
  });

  describe('.remove()', () => {
    it('can remove the only limit command', () => {
      const src = 'FROM index | WHERE a == b | LIMIT 123';
      const { root } = parse(src);

      const node = commands.limit.remove(root);
      const src2 = BasicPrettyPrinter.print(root);

      expect(node).toMatchObject({
        type: 'command',
        name: 'limit',
      });
      expect(src2).toBe('FROM index | WHERE a == b');
    });

    it('can remove the specific limit node', () => {
      const src = 'FROM index | LIMIT 1 | STATS agg() | LIMIT 2 | WHERE a == b | LIMIT 3';
      const { root } = parse(src);

      const node1 = commands.limit.remove(root, 1);
      const src1 = BasicPrettyPrinter.print(root);

      expect(node1).toMatchObject({
        type: 'command',
        name: 'limit',
        args: [
          {
            type: 'literal',
            value: 2,
          },
        ],
      });
      expect(src1).toBe('FROM index | LIMIT 1 | STATS AGG() | WHERE a == b | LIMIT 3');

      const node2 = commands.limit.remove(root);
      const src2 = BasicPrettyPrinter.print(root);

      expect(node2).toMatchObject({
        type: 'command',
        name: 'limit',
        args: [
          {
            type: 'literal',
            value: 1,
          },
        ],
      });
      expect(src2).toBe('FROM index | STATS AGG() | WHERE a == b | LIMIT 3');

      const node3 = commands.limit.remove(root);
      const src3 = BasicPrettyPrinter.print(root);

      expect(node3).toMatchObject({
        type: 'command',
        name: 'limit',
        args: [
          {
            type: 'literal',
            value: 3,
          },
        ],
      });
      expect(src3).toBe('FROM index | STATS AGG() | WHERE a == b');

      const node4 = commands.limit.remove(root);

      expect(node4).toBe(undefined);
    });
  });

  describe('.set()', () => {
    it('can update a specific LIMIT command', () => {
      const src = 'FROM index | LIMIT 1 | STATS agg() | LIMIT 2 | WHERE a == b | LIMIT 3';
      const { root } = parse(src);

      const node1 = commands.limit.set(root, 2222, 1);
      const node2 = commands.limit.set(root, 3333, 2);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe(
        'FROM index | LIMIT 1 | STATS AGG() | LIMIT 2222 | WHERE a == b | LIMIT 3333'
      );
      expect(node1).toMatchObject({
        type: 'command',
        name: 'limit',
        args: [
          {
            type: 'literal',
            value: 2222,
          },
        ],
      });
      expect(node2).toMatchObject({
        type: 'command',
        name: 'limit',
        args: [
          {
            type: 'literal',
            value: 3333,
          },
        ],
      });
    });

    it('by default, updates the first LIMIT command', () => {
      const src = 'FROM index | LIMIT 1 | STATS agg() | LIMIT 2 | WHERE a == b | LIMIT 3';
      const { root } = parse(src);

      const node = commands.limit.set(root, 99999999);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe(
        'FROM index | LIMIT 99999999 | STATS AGG() | LIMIT 2 | WHERE a == b | LIMIT 3'
      );
      expect(node).toMatchObject({
        type: 'command',
        name: 'limit',
        args: [
          {
            type: 'literal',
            value: 99999999,
          },
        ],
      });
    });

    it('does nothing if there is no existing limit command', () => {
      const src = 'FROM index | STATS agg() | WHERE a == b';
      const { root } = parse(src);

      const node = commands.limit.set(root, 99999999);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM index | STATS AGG() | WHERE a == b');
      expect(node).toBe(undefined);
    });
  });

  describe('.upsert()', () => {
    it('can update a specific LIMIT command', () => {
      const src = 'FROM index | LIMIT 1 | STATS agg() | LIMIT 2 | WHERE a == b | LIMIT 3';
      const { root } = parse(src);

      const node1 = commands.limit.upsert(root, 2222, 1);
      const node2 = commands.limit.upsert(root, 3333, 2);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe(
        'FROM index | LIMIT 1 | STATS AGG() | LIMIT 2222 | WHERE a == b | LIMIT 3333'
      );
      expect(node1).toMatchObject({
        type: 'command',
        name: 'limit',
        args: [
          {
            type: 'literal',
            value: 2222,
          },
        ],
      });
      expect(node2).toMatchObject({
        type: 'command',
        name: 'limit',
        args: [
          {
            type: 'literal',
            value: 3333,
          },
        ],
      });
    });

    it('by default, updates the first LIMIT command', () => {
      const src = 'FROM index | LIMIT 1 | STATS agg() | LIMIT 2 | WHERE a == b | LIMIT 3';
      const { root } = parse(src);

      const node = commands.limit.upsert(root, 99999999);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe(
        'FROM index | LIMIT 99999999 | STATS AGG() | LIMIT 2 | WHERE a == b | LIMIT 3'
      );
      expect(node).toMatchObject({
        type: 'command',
        name: 'limit',
        args: [
          {
            type: 'literal',
            value: 99999999,
          },
        ],
      });
    });

    it('inserts a new LIMIT command, if there is none existing', () => {
      const src = 'FROM index | STATS agg() | WHERE a == b';
      const { root } = parse(src);

      const node = commands.limit.upsert(root, 99999999);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM index | STATS AGG() | WHERE a == b | LIMIT 99999999');
      expect(node).toMatchObject({
        type: 'command',
        name: 'limit',
        args: [
          {
            type: 'literal',
            value: 99999999,
          },
        ],
      });
    });
  });
});
