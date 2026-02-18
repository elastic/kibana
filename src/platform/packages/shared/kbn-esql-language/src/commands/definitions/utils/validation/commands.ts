/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isFunctionExpression, isOptionNode, isColumn, isIdentifier } from '../../../../ast/is';
import { validateFunction } from './function';
import { validateOption } from './option';
import { validateColumnForCommand } from './column';
import { errors } from '../errors';
import type { ESQLAst, ESQLAstAllCommands, ESQLMessage } from '../../../../types';
import type { ICommandCallbacks, ICommandContext } from '../../../registry/types';
import { isTimeseriesSourceCommand } from '../timeseries_check';
import { validateInlineCasts } from './inline_cast';

export const validateCommandArguments = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context: ICommandContext = {
    columns: new Map(), // Ensure context is always defined
  },
  callbacks: ICommandCallbacks = {}
) => {
  const messages: ESQLMessage[] = [];
  for (const arg of command.args) {
    if (!Array.isArray(arg)) {
      if (isFunctionExpression(arg)) {
        messages.push(
          ...validateFunction({
            fn: arg,
            parentCommand: command,
            ast,
            context,
            callbacks,
          })
        );
      } else if (isOptionNode(arg)) {
        messages.push(...validateOption(arg, command, ast, context, callbacks));
      } else if (isColumn(arg) || isIdentifier(arg)) {
        if (command.name === 'stats' || command.name === 'inline stats') {
          // In TS context, bare fields are allowed in STATS (implicitly aggregated)
          if (!isTimeseriesSourceCommand(ast)) {
            messages.push(errors.unknownAggFunction(arg));
          }
        } else {
          messages.push(...validateColumnForCommand(arg, command.name, context));
        }
      }
    }
  }

  messages.push(...validateInlineCasts(command, context));

  return messages;
};
