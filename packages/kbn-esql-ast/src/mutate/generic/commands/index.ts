/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLAstQueryExpression, ESQLCommand } from '../../../types';
import { Visitor } from '../../../visitor';
import { Predicate } from '../../types';

export * as args from './args';
export * as options from './options';

/**
 * Returns an iterator for all command AST nodes in the query. If a predicate is
 * provided, only commands that satisfy the predicate will be returned.
 *
 * @param ast Root AST node to search for commands.
 * @param predicate Optional predicate to filter commands.
 * @returns A list of commands found in the AST.
 */
export const list = (
  ast: ESQLAstQueryExpression,
  predicate?: Predicate<ESQLCommand>
): IterableIterator<ESQLCommand> => {
  return new Visitor()
    .on('visitQuery', function* (ctx): IterableIterator<ESQLCommand> {
      for (const cmd of ctx.commands()) {
        if (!predicate || predicate(cmd)) {
          yield cmd;
        }
      }
    })
    .visitQuery(ast);
};

/**
 * Returns the first command AST node at a given index in the query that
 * satisfies the predicate. If no index is provided, the first command found
 * will be returned.
 *
 * @param ast Root AST node to search for commands.
 * @param predicate Optional predicate to filter commands.
 * @param index The index of the command to return.
 * @returns The command found in the AST, if any.
 */
export const find = (
  ast: ESQLAstQueryExpression,
  predicate?: Predicate<ESQLCommand>,
  index: number = 0
): ESQLCommand | undefined => {
  for (const cmd of list(ast, predicate)) {
    if (!index) {
      return cmd;
    }

    index--;
  }

  return undefined;
};

/**
 * Returns the first command AST node at a given index with a given name in the
 * query. If no index is provided, the first command found will be returned.
 *
 * @param ast Root AST node to search for commands.
 * @param commandName The name of the command to find.
 * @param index The index of the command to return.
 * @returns The command found in the AST, if any.
 */
export const findByName = (
  ast: ESQLAstQueryExpression,
  commandName: string,
  index: number = 0
): ESQLCommand | undefined => {
  return find(ast, (cmd) => cmd.name === commandName, index);
};

/**
 * Inserts a new command into the query AST node at the specified index. If the
 * `index` is out of bounds, the command will be appended to the end of the
 * command list.
 *
 * @param ast The root AST node.
 * @param command The command AST node to insert.
 * @param index The index to insert the command at.
 * @returns The index the command was inserted at.
 */
export const insert = (
  ast: ESQLAstQueryExpression,
  command: ESQLCommand,
  index: number = Infinity
): number => {
  const commands = ast.commands;

  if (index > commands.length || index < 0) {
    index = commands.length;
  }

  commands.splice(index, 0, command);

  return index;
};

/**
 * Adds a new command to the query AST node.
 *
 * @param ast The root AST node to append the command to.
 * @param command The command AST node to append.
 */
export const append = (ast: ESQLAstQueryExpression, command: ESQLCommand): void => {
  ast.commands.push(command);
};

export const remove = (ast: ESQLAstQueryExpression, command: ESQLCommand): boolean => {
  const cmds = ast.commands;
  const length = cmds.length;

  for (let i = 0; i < length; i++) {
    if (cmds[i] === command) {
      cmds.splice(i, 1);
      return true;
    }
  }

  return false;
};
