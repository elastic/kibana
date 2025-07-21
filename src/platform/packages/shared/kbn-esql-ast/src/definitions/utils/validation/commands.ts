/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isEqual } from 'lodash';
import {
  isFunctionExpression,
  isOptionNode,
  isColumn,
  isIdentifier,
  isTimeInterval,
} from '../../../ast/is';
import { validateFunction } from './function';
import { validateOption } from './option';
import { validateColumnForCommand } from './column';
import { errors } from '../errors';
import { getMessageFromId } from '../errors';
import { ESQLAst, ESQLCommand, ESQLMessage } from '../../../types';
import { ICommandContext } from '../../../commands_registry/types';

export const validateCommandArguments = (
  command: ESQLCommand,
  ast: ESQLAst,
  context: ICommandContext = {
    userDefinedColumns: new Map(), // Ensure context is always defined
    fields: new Map(),
  }
) => {
  const currentCommandIndex = ast.findIndex((astCommand) => isEqual(astCommand, command));
  const messages: ESQLMessage[] = [];
  for (const arg of command.args) {
    if (!Array.isArray(arg)) {
      if (isFunctionExpression(arg)) {
        messages.push(
          ...validateFunction({
            fn: arg,
            parentCommand: command.name,
            parentOption: undefined,
            context,
            parentAst: ast,
            currentCommandIndex,
          })
        );
      } else if (isOptionNode(arg)) {
        messages.push(...validateOption(arg, command, context));
      } else if (isColumn(arg) || isIdentifier(arg)) {
        if (command.name === 'stats' || command.name === 'inlinestats') {
          messages.push(errors.unknownAggFunction(arg));
        } else {
          messages.push(...validateColumnForCommand(arg, command.name, context));
        }
      } else if (isTimeInterval(arg)) {
        messages.push(
          getMessageFromId({
            messageId: 'unsupportedTypeForCommand',
            values: {
              command: command.name.toUpperCase(),
              type: 'date_period',
              value: arg.name,
            },
            locations: arg.location,
          })
        );
      }
    }
  }
  return messages;
};
