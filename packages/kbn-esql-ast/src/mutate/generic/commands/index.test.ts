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
import * as generic from '..';

describe('generic.commands', () => {
  describe('.list()', () => {
    it('lists all commands', () => {
      const src = 'FROM index | WHERE a == b | LIMIT 123';
      const { root } = parse(src);
      const commands = [...generic.commands.list(root)].map((cmd) => cmd.name);

      expect(commands).toEqual(['from', 'where', 'limit']);
    });
  });

  describe('.find()', () => {
    it('can the first command', () => {
      const src = 'FROM index | WHERE a == b | LIMIT 123';
      const { root } = parse(src);
      const command = generic.commands.find(root, (cmd) => cmd.name === 'from');

      expect(command).toMatchObject({
        type: 'command',
        name: 'from',
        args: [
          {
            type: 'source',
          },
        ],
      });
    });

    it('can the last command', () => {
      const src = 'FROM index | WHERE a == b | LIMIT 123';
      const { root } = parse(src);
      const command = generic.commands.find(root, (cmd) => cmd.name === 'limit');

      expect(command).toMatchObject({
        type: 'command',
        name: 'limit',
        args: [
          {
            type: 'literal',
          },
        ],
      });
    });

    it('find the specific of multiple commands', () => {
      const src = 'FROM index | WHERE a == b | LIMIT 1 | LIMIT 2 | LIMIT 3';
      const { root } = parse(src);
      const command = generic.commands.find(
        root,
        (cmd) => cmd.name === 'limit' && (cmd.args?.[0] as any).value === 2
      );

      expect(command).toMatchObject({
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

  describe('.remove()', () => {
    it('can remove the last command', () => {
      const src = 'FROM index | LIMIT 10';
      const { root } = parse(src);
      const command = generic.commands.findByName(root, 'limit', 0);

      generic.commands.remove(root, command!);

      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM index');
    });

    it('can remove the second command out of 3 with the same name', () => {
      const src = 'FROM index | LIMIT 1 | LIMIT 2 | LIMIT 3';
      const { root } = parse(src);
      const command = generic.commands.findByName(root, 'limit', 1);

      generic.commands.remove(root, command!);

      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM index | LIMIT 1 | LIMIT 3');
    });

    it('can remove all commands', () => {
      const src = 'FROM index | WHERE a == b | LIMIT 123';
      const { root } = parse(src);
      const cmd1 = generic.commands.findByName(root, 'where');
      const cmd2 = generic.commands.findByName(root, 'limit');
      const cmd3 = generic.commands.findByName(root, 'from');

      generic.commands.remove(root, cmd1!);
      generic.commands.remove(root, cmd2!);
      generic.commands.remove(root, cmd3!);

      expect(root.commands.length).toBe(0);
    });
  });
});
