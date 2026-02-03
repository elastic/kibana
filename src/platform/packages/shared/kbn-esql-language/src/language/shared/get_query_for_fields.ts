/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstQueryExpression, ESQLAstForkCommand } from '../../types';
import { EDITOR_MARKER } from '../../commands/definitions/constants';
import { expandEvals } from './expand_evals';

/**
 * This function is used to build the query that will be used to compute the
 * fields available at the final position. It is robust to final partial commands
 * e.g. "FROM logs* | EVAL foo = 1 | EVAL "
 *
 * Generally, this is the user's query up to the end of the previous command, but there
 * are special cases for multi-expression EVAL and FORK branches.
 *
 * IMPORTANT: the AST nodes in the new query still reference locations in the original query text
 *
 * @param queryString The original query string
 * @param commands
 * @returns
 */
export function getQueryForFields(
  queryString: string,
  root: ESQLAstQueryExpression
): ESQLAstQueryExpression {
  const commands = root.commands;
  const lastCommand = commands[commands.length - 1];
  if (lastCommand && lastCommand.name === 'fork' && lastCommand.args.length > 0) {
    /**
     * This flattens the current fork branch into a simpler but equivalent
     * query that is compatible with the existing field computation/caching strategy.
     *
     * The intuition here is that if the cursor is within a fork branch, the
     * previous context is equivalent to a query without the FORK command:
     *
     * Original query: FROM lolz | EVAL foo = 1 | FORK (EVAL bar = 2) (EVAL baz = 3 | WHERE /)
     * Simplified:     FROM lolz | EVAL foo = 1 | EVAL baz = 3
     */
    const forkCommand = lastCommand as ESQLAstForkCommand;
    const currentBranch = forkCommand.args[forkCommand.args.length - 1].child;

    const newCommands = commands.slice(0, -1).concat(currentBranch.commands.slice(0, -1));
    return { ...root, commands: newCommands };
  }

  if (lastCommand && lastCommand.name === 'eval') {
    const endsWithComma = queryString.replace(EDITOR_MARKER, '').trim().endsWith(',');
    if (lastCommand.args.length > 1 || endsWithComma) {
      /**
       * If we get here, we know that we have a multi-expression EVAL statement.
       *
       * e.g. EVAL foo = 1, bar = foo + 1, baz = bar + 1
       *
       * In order for this to work with the caching system which expects field availability to be
       * delineated by pipes, we need to split the current EVAL command into an equivalent
       * set of single-expression EVAL commands.
       *
       * Original query: FROM lolz | EVAL foo = 1, bar = foo + 1, baz = bar + 1, /
       * Simplified:     FROM lolz | EVAL foo = 1 | EVAL bar = foo + 1 | EVAL baz = bar + 1
       */
      const expanded = expandEvals(commands);
      const newCommands = expanded.slice(0, endsWithComma ? undefined : -1);
      return { ...root, commands: newCommands };
    }
  }

  return buildQueryUntilPreviousCommand(root);
}

function buildQueryUntilPreviousCommand(root: ESQLAstQueryExpression) {
  if (root.commands.length === 1) {
    return { ...root, commands: [root.commands[0]] };
  } else {
    return { ...root, commands: root.commands.slice(0, -1) };
  }
}
