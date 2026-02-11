/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLAstAllCommands, ESQLMessage, ESQLAst } from '../../../types';
import { Walker } from '../../../ast/walker';
import { validateCommandArguments } from '../../definitions/utils/validation';
import type { ICommandContext, ICommandCallbacks } from '../types';
import { errors } from '../../definitions/utils';
import { isSubQuery } from '../../../ast/is';

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  messages.push(...validateCommandArguments(command, ast, context, callbacks));

  const allCommands = Walker.commands(ast);
  const fromCommands = allCommands.filter(({ name }) => name.toLowerCase() === 'from');
  const hasSubqueries = fromCommands.some((cmd) => cmd.args.some((arg) => isSubQuery(arg)));
  const isInsideSubquery = !ast.some((cmd) => cmd.location === command.location);

  if (hasSubqueries && !isInsideSubquery) {
    messages.push(errors.inlineStatsNotAllowedAfterLimit(command));
  }

  return messages;
};
