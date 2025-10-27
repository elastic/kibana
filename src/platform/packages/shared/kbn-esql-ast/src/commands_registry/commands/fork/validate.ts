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

const MIN_BRANCHES = 2;
const MAX_BRANCHES = 8;

export const validate = async (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): Promise<ESQLMessage[]> => {
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
      const validationPromises = arg.commands.map(async (subCommand) => {
        const subCommandMethods = esqlCommandRegistry.getCommandMethods(subCommand.name);
        const validationMessages = await subCommandMethods?.validate?.(
          subCommand,
          arg.commands,
          context
        );

        return validationMessages || [];
      });

      const results = await Promise.allSettled(validationPromises);

      for (const result of results) {
        if (result.status === 'fulfilled') {
          messages.push(...result.value);
        }
      }
    }
  }

  const allCommands = Walker.commands(ast);
  const forks = allCommands.filter(({ name }) => name === 'fork');

  if (forks.length > 1) {
    messages.push(errors.tooManyForks(forks[1]));
  }

  return messages;
};
