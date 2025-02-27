/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '../../../parser';
import * as commands from '..';
import { BasicPrettyPrinter } from '../../../pretty_print';
import { Builder } from '../../../builder';

describe('commands.sort', () => {
  describe('.listCommands()', () => {
    it('returns empty array, if there are no sort commands', () => {
      const src = 'FROM index METADATA a';
      const { root } = parse(src);
      const list = [...commands.sort.listCommands(root)];

      expect(list.length).toBe(0);
    });

    it('returns all sort commands', () => {
      const src =
        'FROM index | SORT a ASC, b DESC, c | LIMIT 123 | SORT d | EVAL 1 | SORT e NULLS FIRST, f NULLS LAST';
      const { root } = parse(src);
      const list = [...commands.sort.listCommands(root)];

      expect(list.length).toBe(3);
    });

    it('can skip given number of sort commands', () => {
      const src =
        'FROM index | SORT a ASC, b DESC, c | LIMIT 123 | SORT d | EVAL 1 | SORT e NULLS FIRST, f NULLS LAST';
      const { root } = parse(src);
      const list1 = [...commands.sort.listCommands(root, 1)];
      const list2 = [...commands.sort.listCommands(root, 2)];
      const list3 = [...commands.sort.listCommands(root, 3)];
      const list4 = [...commands.sort.listCommands(root, 111)];

      expect(list1.length).toBe(2);
      expect(list2.length).toBe(1);
      expect(list3.length).toBe(0);
      expect(list4.length).toBe(0);
    });
  });

  describe('.list()', () => {
    it('returns empty array, if there are no sort commands', () => {
      const src = 'FROM index METADATA a';
      const { root } = parse(src);
      const list = [...commands.sort.list(root)];

      expect(list.length).toBe(0);
    });

    it('returns a single column expression', () => {
      const src = 'FROM index | SORT a';
      const { root } = parse(src);
      const list = [...commands.sort.list(root)].map(([node]) => node);

      expect(list.length).toBe(1);
      expect(list[0]).toMatchObject({
        type: 'column',
        name: 'a',
      });
    });

    it('returns a single order expression', () => {
      const src = 'FROM index | SORT a ASC';
      const { root } = parse(src);
      const list = [...commands.sort.list(root)].map(([node]) => node);

      expect(list.length).toBe(1);
      expect(list[0]).toMatchObject({
        type: 'order',
        args: [
          {
            type: 'column',
            name: 'a',
          },
        ],
      });
    });

    it('returns all sort command expressions', () => {
      const src =
        'FROM index | SORT a ASC, b DESC, c | LIMIT 123 | SORT d | EVAL 1 | SORT e NULLS FIRST, f NULLS LAST';
      const { root } = parse(src);
      const list = [...commands.sort.list(root)].map(([node]) => node);

      expect(list).toMatchObject([
        {
          type: 'order',
          args: [
            {
              type: 'column',
              name: 'a',
            },
          ],
        },
        {
          type: 'order',
          args: [
            {
              type: 'column',
              name: 'b',
            },
          ],
        },
        {
          type: 'column',
          name: 'c',
        },
        {
          type: 'column',
          name: 'd',
        },
        {
          type: 'order',
          args: [
            {
              type: 'column',
              name: 'e',
            },
          ],
        },
        {
          type: 'order',
          args: [
            {
              type: 'column',
              name: 'f',
            },
          ],
        },
      ]);
    });

    it('can skip one order expression', () => {
      const src = 'FROM index | SORT b DESC, a ASC';
      const { root } = parse(src);
      const list = [...commands.sort.list(root, 1)].map(([node]) => node);

      expect(list.length).toBe(1);
      expect(list[0]).toMatchObject({
        type: 'order',
        args: [
          {
            type: 'column',
            name: 'a',
          },
        ],
      });
    });
  });

  describe('.find()', () => {
    it('returns undefined if sort expression is not found', () => {
      const src = 'FROM index | WHERE a = b | LIMIT 123';
      const { root } = parse(src);
      const node = commands.sort.find(root, 'abc');

      expect(node).toBe(undefined);
    });

    it('can find a single sort expression', () => {
      const src = 'FROM index | SORT a';
      const { root } = parse(src);
      const [node] = commands.sort.find(root, 'a')!;

      expect(node).toMatchObject({
        type: 'column',
        name: 'a',
      });
    });

    it('can find a single sort (order) expression', () => {
      const src = 'FROM index | SORT b ASC';
      const { root } = parse(src);
      const [node] = commands.sort.find(root, 'b')!;

      expect(node).toMatchObject({
        type: 'order',
        args: [
          {
            type: 'column',
            name: 'b',
          },
        ],
      });
    });

    it('can find a column and specific order expressions among other such expressions', () => {
      const src =
        'FROM index | SORT a, b ASC | STATS agg() | SORT c DESC, d, e NULLS FIRST | LIMIT 10';
      const { root } = parse(src);
      const [node1] = commands.sort.find(root, 'b')!;
      const [node2] = commands.sort.find(root, 'd')!;

      expect(node1).toMatchObject({
        type: 'order',
        args: [
          {
            type: 'column',
            name: 'b',
          },
        ],
      });
      expect(node2).toMatchObject({
        type: 'column',
        name: 'd',
      });
    });

    it('can select second order expression with the same name', () => {
      const src = 'FROM index | SORT b ASC | STATS agg() | SORT b DESC';
      const { root } = parse(src);
      const [node] = commands.sort.find(root, 'b', 1)!;

      expect(node).toMatchObject({
        type: 'order',
        order: 'DESC',
        args: [
          {
            type: 'column',
            name: 'b',
          },
        ],
      });
    });

    it('can find multipart columns', () => {
      const src = 'FROM index | SORT hello, b.a ASC, a.b, c, c.d | STATS agg() | SORT b DESC';
      const { root } = parse(src);
      const [node1] = commands.sort.find(root, ['b', 'a'])!;
      const [node2] = commands.sort.find(root, ['a', 'b'])!;

      expect(node1).toMatchObject({
        type: 'order',
        order: 'ASC',
        args: [
          {
            type: 'column',
            args: [{ name: 'b' }, { name: 'a' }],
          },
        ],
      });
      expect(node2).toMatchObject({
        type: 'column',
        args: [{ name: 'a' }, { name: 'b' }],
      });
    });

    it('returns the parent sort command of the found order expression', () => {
      const src = 'FROM index | SORT hello, b.a ASC, a.b, c, c.d | STATS agg() | SORT b DESC';
      const { root } = parse(src);
      const [node1, command1] = commands.sort.find(root, ['b', 'a'])!;
      const [node2, command2] = commands.sort.find(root, ['a', 'b'])!;

      expect(command1).toBe(command2);
      expect(!!command1.args.find((arg) => arg === node1)).toBe(true);
      expect(!!command2.args.find((arg) => arg === node2)).toBe(true);
    });
  });

  describe('.remove()', () => {
    it('can remove a column from a list', () => {
      const src1 = 'FROM a, b, c | SORT a, b, c';
      const { root } = parse(src1);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM a, b, c | SORT a, b, c');

      commands.sort.remove(root, 'b');

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM a, b, c | SORT a, c');
    });

    it('can remove an order expression from a list', () => {
      const src1 = 'FROM a, b, c | SORT a, b ASC, c';
      const { root } = parse(src1);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM a, b, c | SORT a, b ASC, c');

      commands.sort.remove(root, 'b');

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM a, b, c | SORT a, c');
    });

    it('does nothing if column does not exist', () => {
      const src1 = 'FROM a, b, c | SORT a, c';
      const { root } = parse(src1);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM a, b, c | SORT a, c');

      commands.sort.remove(root, 'b');
      commands.sort.remove(root, 'd');

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM a, b, c | SORT a, c');
    });

    it('can remove the sort expression at specific index', () => {
      const src1 = 'FROM index | SORT a, b, c | LIMIT 1 | SORT a, b, c | LIMIT 2 | SORT a, b, c';
      const { root } = parse(src1);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe(
        'FROM index | SORT a, b, c | LIMIT 1 | SORT a, b, c | LIMIT 2 | SORT a, b, c'
      );

      commands.sort.remove(root, 'a', 1);
      commands.sort.remove(root, 'c', 1);
      commands.sort.remove(root, 'b', 2);

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM index | SORT a, b, c | LIMIT 1 | SORT b | LIMIT 2 | SORT a, c');
    });

    it('removes SORT command, if it is left empty', () => {
      const src1 = 'FROM index | SORT a, b, c | LIMIT 1 | SORT a, b, c | LIMIT 2 | SORT a, b, c';
      const { root } = parse(src1);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe(
        'FROM index | SORT a, b, c | LIMIT 1 | SORT a, b, c | LIMIT 2 | SORT a, b, c'
      );

      commands.sort.remove(root, 'c', 1);
      commands.sort.remove(root, 'b', 1);
      commands.sort.remove(root, 'a', 1);

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM index | SORT a, b, c | LIMIT 1 | LIMIT 2 | SORT a, b, c');
    });

    it('can remove by matching parts', () => {
      const src1 = 'FROM a, b, c | SORT a, b.c, d.e NULLS FIRST, e';
      const { root } = parse(src1);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM a, b, c | SORT a, b.c, d.e NULLS FIRST, e');

      commands.sort.remove(root, ['b', 'c']);

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM a, b, c | SORT a, d.e NULLS FIRST, e');

      commands.sort.remove(root, ['d', 'e']);

      const src4 = BasicPrettyPrinter.print(root);

      expect(src4).toBe('FROM a, b, c | SORT a, e');
    });
  });

  describe('.insertIntoCommand()', () => {
    it('can insert a sorting condition into the first existing SORT command', () => {
      const src1 = 'FROM a, b, c | SORT s1, s2';
      const { root } = parse(src1);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM a, b, c | SORT s1, s2');

      const command = commands.sort.getCommand(root)!;
      commands.sort.insertIntoCommand(command, 's3');

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM a, b, c | SORT s1, s2, s3');
    });

    it('can prepend a sorting condition with options into the first existing SORT command', () => {
      const src1 = 'FROM a, b, c | SORT s1, s2';
      const { root } = parse(src1);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM a, b, c | SORT s1, s2');

      const command = commands.sort.getCommand(root)!;
      commands.sort.insertIntoCommand(
        command,
        { parts: ['address', 'street🙃'], order: 'ASC', nulls: 'NULLS FIRST' },
        0
      );

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM a, b, c | SORT address.`street🙃` ASC NULLS FIRST, s1, s2');
    });

    it('can insert a sorting condition into specific sorting command into specific position', () => {
      const src1 = 'FROM a, b, c | SORT a1, a2 | SORT b1,  /* HERE */  b3 | SORT c1, c2';
      const { root } = parse(src1);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM a, b, c | SORT a1, a2 | SORT b1, b3 | SORT c1, c2');

      const command = commands.sort.getCommand(root, 1)!;
      commands.sort.insertIntoCommand(command, 'b2', 1);

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM a, b, c | SORT a1, a2 | SORT b1, b2, b3 | SORT c1, c2');
    });
  });

  describe('.insertExpression()', () => {
    it('can insert a sorting condition into the first existing SORT command', () => {
      const src1 = 'FROM a, b, c | SORT s1, s2';
      const { root } = parse(src1);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM a, b, c | SORT s1, s2');

      commands.sort.insertExpression(root, 's3');

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM a, b, c | SORT s1, s2, s3');
    });

    it('can insert a sorting condition into specific sorting command into specific position', () => {
      const src1 = 'FROM a, b, c | SORT a1, a2 | SORT b1,  /* HERE */  b3 | SORT c1, c2';
      const { root } = parse(src1);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM a, b, c | SORT a1, a2 | SORT b1, b3 | SORT c1, c2');

      commands.sort.insertExpression(root, 'b2', 1, 1);

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM a, b, c | SORT a1, a2 | SORT b1, b2, b3 | SORT c1, c2');
    });

    it('when no positional arguments are provided append the column to the first SORT command', () => {
      const src1 = 'FROM a, b, c | SORT a1, a2 | SORT b1, b2 | SORT c1, c2';
      const { root } = parse(src1);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM a, b, c | SORT a1, a2 | SORT b1, b2 | SORT c1, c2');

      commands.sort.insertExpression(root, 'a3');

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM a, b, c | SORT a1, a2, a3 | SORT b1, b2 | SORT c1, c2');
    });

    it('when no SORT command found, inserts a new SORT command', () => {
      const src1 = 'FROM a, b, c | LIMIT 10';
      const { root } = parse(src1);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM a, b, c | LIMIT 10');

      commands.sort.insertExpression(root, ['i18n', 'language', 'locale']);

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM a, b, c | LIMIT 10 | SORT i18n.language.locale');
    });

    it('can change the sorting order', () => {
      const src1 = 'FROM a, b, c | SORT a ASC';
      const { root } = parse(src1);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM a, b, c | SORT a ASC');

      commands.sort.insertExpression(root, { parts: 'a', order: 'DESC' });
      commands.sort.remove(root, 'a', 0);

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM a, b, c | SORT a DESC');
    });
  });

  describe('.insertCommand()', () => {
    it('can append a new SORT command', () => {
      const src1 = 'FROM a, b, c | SORT s1, s2';
      const { root } = parse(src1);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM a, b, c | SORT s1, s2');

      commands.sort.insertCommand(root, 's3');

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM a, b, c | SORT s1, s2 | SORT s3');
    });

    it('can insert a SORT command before a LIMIT command (and add a comment)', () => {
      const src1 = 'FROM a, b, c | LIMIT 10';
      const { root } = parse(src1);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM a, b, c | LIMIT 10');

      const [_, column] = commands.sort.insertCommand(root, 'b', 1);

      column.formatting = {
        right: [Builder.comment('multi-line', ' we sort by "b" ')],
      };

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM a, b, c | SORT b /* we sort by "b" */ | LIMIT 10');
    });
  });
});
