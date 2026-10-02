/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLAst, ESQLAstAllCommands, ESQLAstForkCommand } from '@elastic/esql/types';
import type { ICommandContext, ICommandCallbacks } from '../types';
import { validateCommandArguments } from '../../definitions/utils/validation';
import { errors } from '../../definitions/utils';
import type { ESQLMessage } from '../../definitions/types';

const MAX_BRANCHES = 8;

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const forkCommand = command as ESQLAstForkCommand;
  const messages: ESQLMessage[] = [];

  if (forkCommand.args.length > MAX_BRANCHES) {
    messages.push(errors.forkTooManyBranches(forkCommand));
  }

  messages.push(...validateCommandArguments(forkCommand, ast, context, callbacks));

  // `ast` is this pipeline alone: a subquery runs on its own and may hold a FORK of its own.
  const forks = ast.filter(({ name }) => name === 'fork');

  if (forks.length > 1) {
    messages.push(errors.tooManyForks(forks[1]));
  }

  return messages;
};
