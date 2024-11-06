/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '../../../../builder';
import { parse } from '../../../../parser';
import { BasicPrettyPrinter } from '../../../../pretty_print';
import * as generic from '../..';

describe('generic.commands.args', () => {
  describe('.insert()', () => {
    it('can insert at the end of the list', () => {
      const src = 'FROM index | LIMIT 10';
      const { root } = parse(src);
      const command = generic.commands.findByName(root, 'from', 0);

      generic.commands.args.insert(
        command!,
        Builder.expression.source({ name: 'test', sourceType: 'index' }),
        123
      );

      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM index, test | LIMIT 10');
    });

    it('can insert at the beginning of the list', () => {
      const src = 'FROM index | LIMIT 10';
      const { root } = parse(src);
      const command = generic.commands.findByName(root, 'from', 0);

      generic.commands.args.insert(
        command!,
        Builder.expression.source({ name: 'test', sourceType: 'index' }),
        0
      );

      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM test, index | LIMIT 10');
    });

    it('can insert in the middle of the list', () => {
      const src = 'FROM index1, index2 | LIMIT 10';
      const { root } = parse(src);
      const command = generic.commands.findByName(root, 'from', 0);

      generic.commands.args.insert(
        command!,
        Builder.expression.source({ name: 'test', sourceType: 'index' }),
        1
      );

      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM index1, test, index2 | LIMIT 10');
    });

    describe('with option present', () => {
      it('can insert at the end of the list', () => {
        const src = 'FROM index METADATA _id | LIMIT 10';
        const { root } = parse(src);
        const command = generic.commands.findByName(root, 'from', 0);

        generic.commands.args.insert(
          command!,
          Builder.expression.source({ name: 'test', sourceType: 'index' }),
          123
        );

        const src2 = BasicPrettyPrinter.print(root);

        expect(src2).toBe('FROM index, test METADATA _id | LIMIT 10');
      });

      it('can insert at the beginning of the list', () => {
        const src = 'FROM index METADATA _id | LIMIT 10';
        const { root } = parse(src);
        const command = generic.commands.findByName(root, 'from', 0);

        generic.commands.args.insert(
          command!,
          Builder.expression.source({ name: 'test', sourceType: 'index' }),
          0
        );

        const src2 = BasicPrettyPrinter.print(root);

        expect(src2).toBe('FROM test, index METADATA _id | LIMIT 10');
      });

      it('can insert in the middle of the list', () => {
        const src = 'FROM index1, index2 METADATA _id | LIMIT 10';
        const { root } = parse(src);
        const command = generic.commands.findByName(root, 'from', 0);

        generic.commands.args.insert(
          command!,
          Builder.expression.source({ name: 'test', sourceType: 'index' }),
          1
        );

        const src2 = BasicPrettyPrinter.print(root);

        expect(src2).toBe('FROM index1, test, index2 METADATA _id | LIMIT 10');
      });
    });
  });

  describe('.append()', () => {
    it('can append and argument', () => {
      const src = 'FROM index METADATA _id | LIMIT 10';
      const { root } = parse(src);
      const command = generic.commands.findByName(root, 'from', 0);

      generic.commands.args.append(
        command!,
        Builder.expression.source({ name: 'test', sourceType: 'index' })
      );

      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM index, test METADATA _id | LIMIT 10');
    });
  });
});
