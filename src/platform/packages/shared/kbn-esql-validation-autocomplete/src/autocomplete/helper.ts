/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type ESQLCommand, ESQLAstQueryExpression, BasicPrettyPrinter } from '@kbn/esql-ast';

/**
 * This function is used to build the query that will be used to compute the
 * available fields for the current cursor location.
 *
 * Generally, this is the user's query up to the end of the previous command.
 *
 * @param queryString The original query string
 * @param commands
 * @returns
 */
export function getQueryForFields(queryString: string, root: ESQLAstQueryExpression): string {
  const commands = root.commands;
  const lastCommand = commands[commands.length - 1];
  if (lastCommand && lastCommand.name === 'fork' && lastCommand.args.length > 0) {
    /**
     * This translates the current fork command branch into a simpler but equivalent
     * query that is compatible with the existing field computation/caching strategy.
     *
     * The intuition here is that if the cursor is within a fork branch, the
     * previous context is equivalent to a query without the FORK command.:
     *
     * Original query: FROM lolz | EVAL foo = 1 | FORK (EVAL bar = 2) (EVAL baz = 3 | WHERE /)
     * Simplified: FROM lolz | EVAL foo = 1 | EVAL baz = 3 | WHERE /
     */
    const currentBranch = lastCommand.args[lastCommand.args.length - 1] as ESQLAstQueryExpression;
    const newCommands = commands.slice(0, -1).concat(currentBranch.commands.slice(0, -1));
    return BasicPrettyPrinter.print({ ...root, commands: newCommands });
  }

  // If there is only one source command and it does not require fields, do not
  // fetch fields, hence return an empty string.
  return commands.length === 1 && ['row', 'show'].includes(commands[0].name)
    ? ''
    : buildQueryUntilPreviousCommand(queryString, commands);
}

// TODO consider replacing this with a pretty printer-based solution
function buildQueryUntilPreviousCommand(queryString: string, commands: ESQLCommand[]) {
  const prevCommand = commands[Math.max(commands.length - 2, 0)];
  return prevCommand ? queryString.substring(0, prevCommand.location.max + 1) : queryString;
}
