/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '../../../../builder';
import { ESQLAstQueryExpression, ESQLCommand, ESQLCommandOption } from '../../../../types';
import { Visitor } from '../../../../visitor';
import { Predicate } from '../../../types';
import * as commands from '..';

/**
 * Returns the first command option AST node that satisfies the predicate.
 *
 * @param command The command AST node to search for options.
 * @param predicate The predicate to filter options.
 * @returns The option found in the command, if any.
 */
export const find = (
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
 * Returns the first command option AST node with a given name in the query.
 *
 * @param ast The root AST node to search for command options.
 * @param commandName Command name to search for.
 * @param optionName Option name to search for.
 * @returns The option found in the command, if any.
 */
export const findByName = (
  ast: ESQLAstQueryExpression,
  commandName: string,
  optionName: string
): ESQLCommandOption | undefined => {
  const command = commands.find(ast, (cmd) => cmd.name === commandName);

  if (!command) {
    return undefined;
  }

  return find(command, (opt) => opt.name === optionName);
};

/**
 * Inserts a command option into the command's arguments list. The option can
 * be specified as a string or an AST node.
 *
 * @param command The command AST node to insert the option into.
 * @param option The option to insert.
 * @returns The inserted option.
 */
export const append = (
  command: ESQLCommand,
  option: string | ESQLCommandOption
): ESQLCommandOption => {
  if (typeof option === 'string') {
    option = Builder.option({ name: option });
  }

  command.args.push(option);

  return option;
};

/**
 * Removes the first command option from the command's arguments list that
 * satisfies the predicate.
 *
 * @param command The command AST node to remove the option from.
 * @param predicate The predicate to filter options.
 * @returns The removed option, if any.
 */
export const remove = (ast: ESQLAstQueryExpression, option: ESQLCommandOption): boolean => {
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
