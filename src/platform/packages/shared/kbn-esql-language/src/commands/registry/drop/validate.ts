/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { errors } from '../../definitions/utils';
import { isColumn } from '../../../ast/is';
import type { ESQLAst, ESQLColumn, ESQLAstAllCommands, ESQLMessage } from '../../../types';
import { validateCommandArguments } from '../../definitions/utils/validation';
import type { ICommandContext, ICommandCallbacks } from '../types';

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];
  const droppingTimestamp = command.args.find(
    (arg) => isColumn(arg) && arg.name === '@timestamp'
  ) as ESQLColumn;
  if (droppingTimestamp) {
    messages.push(errors.dropTimestampWarning(droppingTimestamp));
  }

  messages.push(...validateCommandArguments(command, ast, context, callbacks));
  return messages;
};
