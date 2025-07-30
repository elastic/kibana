/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLColumn, ESQLIdentifier, ESQLMessage } from '../../../types';
import { ICommandContext } from '../../../commands_registry/types';
import { errors } from '../errors';
import { getColumnExists } from '../columns';
import { isParametrized } from '../../../ast/is';

export function validateColumnForCommand(
  column: ESQLColumn | ESQLIdentifier,
  commandName: string,
  context: ICommandContext
): ESQLMessage[] {
  const messages: ESQLMessage[] = [];
  if (commandName === 'row') {
    if (!context.userDefinedColumns.has(column.name) && !isParametrized(column)) {
      messages.push(errors.unknownColumn(column));
    }
  } else if (!getColumnExists(column, context) && !isParametrized(column)) {
    messages.push(errors.unknownColumn(column));
  }

  return messages;
}
