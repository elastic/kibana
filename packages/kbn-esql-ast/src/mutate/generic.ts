/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOptionNode } from '../ast/util';
import { Builder } from '../builder';
import {
  ESQLAstQueryExpression,
  ESQLCommand,
  ESQLCommandOption,
  ESQLProperNode,
  ESQLSingleAstItem,
} from '../types';
import { Visitor } from '../visitor';
import { Predicate } from './types';

/**
 * Returns an iterator for all command AST nodes in the query. If a predicate is
 * provided, only commands that satisfy the predicate will be returned.
 *
 * @param ast Root AST node to search for commands.
 * @param predicate Optional predicate to filter commands.
 * @returns A list of commands found in the AST.
 */
export const listCommands = (
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
export const findCommand = (
  ast: ESQLAstQueryExpression,
  predicate?: Predicate<ESQLCommand>,
  index: number = 0
): ESQLCommand | undefined => {
  for (const cmd of listCommands(ast, predicate)) {
    if (!index) {
      return cmd;
    }

    index--;
  }

  return undefined;
};

/**
 * Returns the first command option AST node that satisfies the predicate.
 *
 * @param command The command AST node to search for options.
 * @param predicate The predicate to filter options.
 * @returns The option found in the command, if any.
 */
export const findCommandOption = (
  command: ESQLCommand,
  predicate: Predicate<ESQLCommandOption>
): ESQLCommandOption | undefined => {
  return new Visitor()
    .on('visitCommand', (ctx): ESQLCommandOption | undefined => {
      for (const opt of ctx.options()) {
        if (predicate(opt)) {
          return opt;
        }
      }

      return undefined;
    })
    .visitCommand(command);
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
export const findCommandByName = (
  ast: ESQLAstQueryExpression,
  commandName: string,
  index: number = 0
): ESQLCommand | undefined => {
  return findCommand(ast, (cmd) => cmd.name === commandName, index);
};

/**
 * Returns the first command option AST node with a given name in the query.
 *
 * @param ast The root AST node to search for command options.
 * @param commandName Command name to search for.
 * @param optionName Option name to search for.
 * @returns The option found in the command, if any.
 */
export const findCommandOptionByName = (
  ast: ESQLAstQueryExpression,
  commandName: string,
  optionName: string
): ESQLCommandOption | undefined => {
  const command = findCommand(ast, (cmd) => cmd.name === commandName);

  if (!command) {
    return undefined;
  }

  return findCommandOption(command, (opt) => opt.name === optionName);
};

/**
 * Adds a new command to the query AST node.
 *
 * @param ast The root AST node to append the command to.
 * @param command The command AST node to append.
 */
export const appendCommand = (ast: ESQLAstQueryExpression, command: ESQLCommand): void => {
  ast.commands.push(command);
};

/**
 * Inserts a command option into the command's arguments list. The option can
 * be specified as a string or an AST node.
 *
 * @param command The command AST node to insert the option into.
 * @param option The option to insert.
 * @returns The inserted option.
 */
export const appendCommandOption = (
  command: ESQLCommand,
  option: string | ESQLCommandOption
): ESQLCommandOption => {
  if (typeof option === 'string') {
    option = Builder.option({ name: option });
  }

  command.args.push(option);

  return option;
};

export const insertCommandArgument = (
  command: ESQLCommand,
  expression: ESQLSingleAstItem,
  index: number = -1
): number => {
  if (expression.type === 'option') {
    command.args.push(expression);
    return command.args.length - 1;
  }

  let mainArgumentCount = command.args.findIndex((arg) => isOptionNode(arg));

  if (mainArgumentCount < 0) {
    mainArgumentCount = command.args.length;
  }
  if (index === -1) {
    index = mainArgumentCount;
  }
  if (index > mainArgumentCount) {
    index = mainArgumentCount;
  }

  command.args.splice(index, 0, expression);

  return mainArgumentCount + 1;
};

export const appendCommandArgument = (
  command: ESQLCommand,
  expression: ESQLSingleAstItem
): number => {
  return insertCommandArgument(command, expression, -1);
};

export const removeCommand = (ast: ESQLAstQueryExpression, command: ESQLCommand): boolean => {
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

/**
 * Removes the first command option from the command's arguments list that
 * satisfies the predicate.
 *
 * @param command The command AST node to remove the option from.
 * @param predicate The predicate to filter options.
 * @returns The removed option, if any.
 */
export const removeCommandOption = (
  ast: ESQLAstQueryExpression,
  option: ESQLCommandOption
): boolean => {
  return new Visitor()
    .on('visitCommandOption', (ctx): boolean => {
      return ctx.node === option;
    })
    .on('visitCommand', (ctx): boolean => {
      let target: undefined | ESQLCommandOption;

      for (const opt of ctx.options()) {
        if (opt === option) {
          target = opt;
          break;
        }
      }

      if (!target) {
        return false;
      }

      const index = ctx.node.args.indexOf(target);

      if (index === -1) {
        return false;
      }

      ctx.node.args.splice(index, 1);

      return true;
    })
    .on('visitQuery', (ctx): boolean => {
      for (const success of ctx.visitCommands()) {
        if (success) {
          return true;
        }
      }

      return false;
    })
    .visitQuery(ast);
};

/**
 * Searches all command arguments in the query AST node and removes the node
 * from the command's arguments list.
 *
 * @param ast The root AST node to search for command arguments.
 * @param node The argument AST node to remove.
 * @returns Returns the command that the argument was removed from, if any.
 */
export const removeCommandArgument = (
  ast: ESQLAstQueryExpression,
  node: ESQLProperNode
): ESQLCommand | undefined => {
  return new Visitor()
    .on('visitCommand', (ctx): ESQLCommand | undefined => {
      const args = ctx.node.args;
      const length = args.length;

      for (let i = 0; i < length; i++) {
        if (args[i] === node) {
          args.splice(i, 1);
          return ctx.node;
        }
      }

      return undefined;
    })
    .on('visitQuery', (ctx): ESQLCommand | undefined => {
      for (const cmd of ctx.visitCommands()) {
        if (cmd) {
          return cmd;
        }
      }

      return undefined;
    })
    .visitQuery(ast);
};
