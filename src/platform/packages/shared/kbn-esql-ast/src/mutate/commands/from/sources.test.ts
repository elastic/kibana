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

describe('commands.from.sources', () => {
  describe('.list()', () => {
    it('returns empty array, if there are no sources', () => {
      const src = 'ROW 123';
      const { root } = parse(src);
      const list = [...commands.from.sources.list(root)];

      expect(list.length).toBe(0);
    });

    it('returns a single source', () => {
      const src = 'FROM index METADATA a';
      const { root } = parse(src);
      const list = [...commands.from.sources.list(root)];

      expect(list.length).toBe(1);
      expect(list[0]).toMatchObject({
        type: 'source',
      });
    });

    it('returns all source fields', () => {
      const src = 'FROM index, index2, cl:index3 METADATA a | LIMIT 88';
      const { root } = parse(src);
      const list = [...commands.from.sources.list(root)];

      expect(list).toMatchObject([
        {
          type: 'source',
          index: 'index',
        },
        {
          type: 'source',
          index: 'index2',
        },
        {
          type: 'source',
          index: 'index3',
          cluster: 'cl',
        },
      ]);
    });
  });

  describe('.find()', () => {
    it('returns undefined if source is not found', () => {
      const src = 'FROM index | WHERE a = b | LIMIT 123';
      const { root } = parse(src);
      const source = commands.from.sources.find(root, 'abc');

      expect(source).toBe(undefined);
    });

    it('can find a single source', () => {
      const src = 'FROM index METADATA a';
      const { root } = parse(src);
      const source = commands.from.sources.find(root, 'index')!;

      expect(source).toMatchObject({
        type: 'source',
        name: 'index',
        index: 'index',
      });
    });

    it('can find a source withing other sources', () => {
      const src = 'FROM index, a, b, c:s1, s1, s2 METADATA a, b, c, _lang, _id';
      const { root } = parse(src);
      const source1 = commands.from.sources.find(root, 's2')!;
      const source2 = commands.from.sources.find(root, 's1', 'c')!;

      expect(source1).toMatchObject({
        type: 'source',
        name: 's2',
        index: 's2',
      });
      expect(source2).toMatchObject({
        type: 'source',
        name: 'c:s1',
        index: 's1',
        cluster: 'c',
      });
    });
  });

  describe('.remove()', () => {
    it('can remove a source from a list', () => {
      const src1 = 'FROM a, b, c';
      const { root } = parse(src1);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM a, b, c');

      commands.from.sources.remove(root, 'b');

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM a, c');
    });

    it('does nothing if source-to-delete does not exist', () => {
      const src1 = 'FROM a, b, c';
      const { root } = parse(src1);
      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM a, b, c');

      commands.from.sources.remove(root, 'd');

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM a, b, c');
    });
  });

  describe('.insert()', () => {
    it('can append a source', () => {
      const src1 = 'FROM index METADATA a';
      const { root } = parse(src1);

      commands.from.sources.insert(root, 'index2');

      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM index, index2 METADATA a');
    });

    it('can insert at specified position', () => {
      const src1 = 'FROM a1, a2, a3';
      const { root } = parse(src1);

      commands.from.sources.insert(root, 'x', '', 0);

      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM x, a1, a2, a3');

      commands.from.sources.insert(root, 'y', '', 2);

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM x, a1, y, a2, a3');

      commands.from.sources.insert(root, 'z', '', 4);

      const src4 = BasicPrettyPrinter.print(root);

      expect(src4).toBe('FROM x, a1, y, a2, z, a3');
    });

    it('appends element, when insert position too high', () => {
      const src1 = 'FROM a1, a2, a3';
      const { root } = parse(src1);

      commands.from.sources.insert(root, 'x', '', 999);

      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM a1, a2, a3, x');
    });

    it('can inset the same source twice', () => {
      const src1 = 'FROM index';
      const { root } = parse(src1);

      commands.from.sources.insert(root, 'x', '', 999);
      commands.from.sources.insert(root, 'x', '', 999);

      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM index, x, x');
    });
  });

  describe('.upsert()', () => {
    it('can append a source', () => {
      const src1 = 'FROM index METADATA a';
      const { root } = parse(src1);

      commands.from.sources.upsert(root, 'index2');

      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM index, index2 METADATA a');
    });

    it('can upsert at specified position', () => {
      const src1 = 'FROM a1, a2, a3';
      const { root } = parse(src1);

      commands.from.sources.upsert(root, 'x', '', 0);

      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM x, a1, a2, a3');

      commands.from.sources.upsert(root, 'y', '', 2);

      const src3 = BasicPrettyPrinter.print(root);

      expect(src3).toBe('FROM x, a1, y, a2, a3');

      commands.from.sources.upsert(root, 'z', '', 4);

      const src4 = BasicPrettyPrinter.print(root);

      expect(src4).toBe('FROM x, a1, y, a2, z, a3');
    });

    it('appends element, when upsert position too high', () => {
      const src1 = 'FROM a1, a2, a3';
      const { root } = parse(src1);

      commands.from.sources.upsert(root, 'x', '', 999);

      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM a1, a2, a3, x');
    });

    it('inserting already existing source is a no-op', () => {
      const src1 = 'FROM index';
      const { root } = parse(src1);

      commands.from.sources.upsert(root, 'x', '', 999);
      commands.from.sources.upsert(root, 'x', '', 999);

      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM index, x');
    });
  });
});
