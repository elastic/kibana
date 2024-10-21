/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '../parser';
import { BasicPrettyPrinter } from '../pretty_print';
import * as generic from './generic';

describe('generic', () => {
  describe('.listCommands()', () => {
    it('lists all commands', () => {
      const src = 'FROM index | WHERE a == b | LIMIT 123';
      const { root } = parse(src);
      const commands = [...generic.listCommands(root)].map((cmd) => cmd.name);

      expect(commands).toEqual(['from', 'where', 'limit']);
    });
  });

  describe('.findCommand()', () => {
    it('can the first command', () => {
      const src = 'FROM index | WHERE a == b | LIMIT 123';
      const { root } = parse(src);
      const command = generic.findCommand(root, (cmd) => cmd.name === 'from');

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
      const command = generic.findCommand(root, (cmd) => cmd.name === 'limit');

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
      const command = generic.findCommand(
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

  describe('.findCommandOptionByName()', () => {
    it('can the find a command option', () => {
      const src = 'FROM index METADATA _score';
      const { root } = parse(src);
      const option = generic.findCommandOptionByName(root, 'from', 'metadata');

      expect(option).toMatchObject({
        type: 'option',
        name: 'metadata',
      });
    });

    it('returns undefined if there is no option', () => {
      const src = 'FROM index';
      const { root } = parse(src);
      const option = generic.findCommandOptionByName(root, 'from', 'metadata');

      expect(option).toBe(undefined);
    });
  });

  describe('.removeCommand()', () => {
    it('can remove the last command', () => {
      const src = 'FROM index | LIMIT 10';
      const { root } = parse(src);
      const command = generic.findCommandByName(root, 'limit', 0);

      generic.removeCommand(root, command!);

      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM index');
    });

    it('can remove the second command out of 3 with the same name', () => {
      const src = 'FROM index | LIMIT 1 | LIMIT 2 | LIMIT 3';
      const { root } = parse(src);
      const command = generic.findCommandByName(root, 'limit', 1);

      generic.removeCommand(root, command!);

      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM index | LIMIT 1 | LIMIT 3');
    });

    it('can remove all commands', () => {
      const src = 'FROM index | WHERE a == b | LIMIT 123';
      const { root } = parse(src);
      const cmd1 = generic.findCommandByName(root, 'where');
      const cmd2 = generic.findCommandByName(root, 'limit');
      const cmd3 = generic.findCommandByName(root, 'from');

      generic.removeCommand(root, cmd1!);
      generic.removeCommand(root, cmd2!);
      generic.removeCommand(root, cmd3!);

      expect(root.commands.length).toBe(0);
    });
  });

  describe('.removeCommandOption()', () => {
    it('can remove existing command option', () => {
      const src = 'FROM index METADATA _score';
      const { root } = parse(src);
      const option = generic.findCommandOptionByName(root, 'from', 'metadata');

      generic.removeCommandOption(root, option!);

      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM index');
    });
  });
});
