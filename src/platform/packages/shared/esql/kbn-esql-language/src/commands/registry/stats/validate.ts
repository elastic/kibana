/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstAllCommands, ESQLAst, ESQLAstItem } from '@elastic/esql/types';
import { validateCommandArguments } from '../../definitions/utils/validation';
import type { ICommandContext, ICommandCallbacks } from '../types';
import type { ESQLMessage } from '../../definitions/types';
import { getColumnsDefinedInByClause, isByOption, isStatsCommand } from './utils';

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks,
  query?: string
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  // Columns defined before this command
  const inputColumns = context?.columns;

  // Perform usual validation if we are missing required context, also works as type inference.
  if (!context || !inputColumns || !isStatsCommand(command)) {
    messages.push(...validateCommandArguments(command, ast, context, callbacks));
    return messages;
  }

  // STATS has the peculiarity that can use columns that it self-define in the BY clause.
  // It can use them in the aggregation expression and the WHERE clause, but not reference them in the BY clause itself.
  // This requires some special handling, we need to add the new columns in the context when validating all arguments,
  // except for the BY clause itself.

  // 1. We get the new column definitions from the BY clause, if any.
  const assignments = getColumnsDefinedInByClause(
    command,
    inputColumns,
    query,
    context.unmappedFieldsStrategy
  );

  // 2. If we have no assignments, we can validate the command as usual.
  if (assignments.size === 0) {
    messages.push(...validateCommandArguments(command, ast, context, callbacks));
    return messages;
  }

  // 3. We split the arguments into BY arguments and the rest.
  const aggregatingArgs: ESQLAstItem[] = [];
  const byArgs: ESQLAstItem[] = [];
  for (const arg of command.args) {
    if (isByOption(arg)) {
      byArgs.push(arg);
    } else {
      aggregatingArgs.push(arg);
    }
  }

  // 4. We validate all arguments except for the BY clause with the updated columns.
  const aggregatingContext: ICommandContext = {
    ...context,
    columns: new Map([...inputColumns, ...assignments]),
  };
  messages.push(
    ...validateCommandArguments(
      {
        ...command,
        args: aggregatingArgs,
      },
      ast,
      aggregatingContext,
      callbacks
    )
  );

  // 5. We validate the BY clause with the original columns.
  messages.push(
    ...validateCommandArguments(
      {
        ...command,
        args: byArgs,
      },
      ast,
      context,
      callbacks
    )
  );

  return messages;
};
