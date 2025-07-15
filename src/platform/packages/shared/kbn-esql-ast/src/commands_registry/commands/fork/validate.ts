/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ESQLAst, ESQLCommand, ESQLMessage } from '../../../types';
import { Walker } from '../../../walker';
import { ICommandContext } from '../../types';
import { validateCommandArguments } from '../../../definitions/utils/validation';
import { esqlCommandRegistry } from '../..';
import { errors } from '../../../definitions/utils';

export const validate = (
  command: ESQLCommand,
  ast: ESQLAst,
  context?: ICommandContext
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  if (command.args.length < 2) {
    messages.push({
      location: command.location,
      text: i18n.translate('kbn-esql-ast.esql.validation.forkTooFewBranches', {
        defaultMessage: '[FORK] Must include at least two branches.',
      }),
      type: 'error',
      code: 'forkTooFewBranches',
    });
  }

  messages.push(...validateCommandArguments(command, ast, context));

  for (const arg of command.args.flat()) {
    if (!Array.isArray(arg) && arg.type === 'query') {
      // all the args should be commands
      arg.commands.forEach((subCommand) => {
        const subCommandMethods = esqlCommandRegistry.getCommandMethods(subCommand.name);
        const validationMessages = subCommandMethods?.validate?.(subCommand, ast, context);
        messages.push(...(validationMessages || []));
      });
    }
  }

  const allCommands = Walker.commands(ast);
  const forks = allCommands.filter(({ name }) => name === 'fork');

  const hasTooManyForksError = errors.tooManyForks(command);
  const hasTooManyForksErrorExists = messages.some(
    (message) => message.code === hasTooManyForksError.code
  );
  if (forks.length > 1 && !hasTooManyForksErrorExists) {
    messages.push(errors.tooManyForks(forks[1]));
  }

  context?.fields.set('_fork', {
    name: '_fork',
    type: 'keyword',
  });

  return messages;
};
