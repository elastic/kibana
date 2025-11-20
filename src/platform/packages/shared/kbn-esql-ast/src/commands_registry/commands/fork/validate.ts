/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLAst, ESQLAstAllCommands, ESQLMessage } from '../../../types';
import { Walker } from '../../../walker';
import type { ICommandContext, ICommandCallbacks } from '../../types';
import { validateCommandArguments } from '../../../definitions/utils/validation';
import { esqlCommandRegistry } from '../..';
import { errors } from '../../../definitions/utils';
import { isSubQuery } from '../../../ast/is';

const MIN_BRANCHES = 2;
const MAX_BRANCHES = 8;

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  if (command.args.length < MIN_BRANCHES) {
    messages.push(errors.forkTooFewBranches(command));
  }

  if (command.args.length > MAX_BRANCHES) {
    messages.push(errors.forkTooManyBranches(command));
  }

  messages.push(...validateCommandArguments(command, ast, context, callbacks));

  for (const arg of command.args.flat()) {
    if (!Array.isArray(arg) && arg.type === 'query') {
      // all the args should be commands
      arg.commands.forEach((subCommand) => {
        const subCommandMethods = esqlCommandRegistry.getCommandMethods(subCommand.name);
        const validationMessages = subCommandMethods?.validate?.(subCommand, arg.commands, context);
        messages.push(...(validationMessages || []));
      });
    }
  }

  const allCommands = Walker.commands(ast);
  const forks = allCommands.filter(({ name }) => name === 'fork');

  if (forks.length > 1) {
    messages.push(errors.tooManyForks(forks[1]));
  }

  // FORK is not allowed when the query contains subqueries
  const fromCommands = allCommands.filter(({ name }) => name.toLowerCase() === 'from');
  const hasSubqueries = fromCommands.some((cmd) => cmd.args.some((arg) => isSubQuery(arg)));

  if (hasSubqueries) {
    messages.push(errors.forkNotAllowedWithSubqueries(command));
  }

  return messages;
};
