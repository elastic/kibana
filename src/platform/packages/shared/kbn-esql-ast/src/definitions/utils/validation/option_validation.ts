/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand, ESQLCommandOption, ESQLMessage } from '../../../types';
import { ICommandContext } from '../../../commands_registry/types';
import { isColumn, isFunctionExpression } from '../../../ast/is';
import { validateColumnForCommand } from './column_validation';
import { validateFunction } from './function_validation';

export function validateOption(
  option: ESQLCommandOption,
  command: ESQLCommand,
  context: ICommandContext
): ESQLMessage[] {
  // check if the arguments of the option are of the correct type
  const messages: ESQLMessage[] = [];
  if (option.incomplete || command.incomplete || option.name === 'metadata') {
    return messages;
  }

  if (option.name === 'metadata') {
    // Validation for the metadata statement is handled in the FROM command's validate method
    return messages;
  }

  for (const arg of option.args) {
    if (Array.isArray(arg)) {
      continue;
    }
    if (isColumn(arg)) {
      messages.push(...validateColumnForCommand(arg, command.name, context));
    } else if (isFunctionExpression(arg)) {
      messages.push(
        ...validateFunction({
          fn: arg,
          parentCommand: command.name,
          parentOption: option.name,
          context,
        })
      );
    }
  }

  return messages;
}
