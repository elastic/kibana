/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstQueryExpression } from '@elastic/esql/types';
import { esqlCommandRegistry } from '../../commands/registry';
import { queryUntilPreviousCommand } from './query_until_previous_command';

/**
 * This function is used to build the query that will be used to compute the
 * fields available at the final position. It is robust to final partial commands
 * e.g. "FROM logs* | EVAL foo = 1 | EVAL "
 *
 * Generally, this is the user's query up to the end of the previous command, but commands that
 * define columns usable within themselves (EVAL, FORK, STATS ... BY) reshape it through their
 * `columnsInScope` method so those columns are available too.
 *
 * IMPORTANT: the AST nodes in the new query still reference locations in the original query text
 *
 * @param queryString The query text `root` was parsed from
 * @param root The parsed query
 * @param options Full editor text and cursor offset, needed by commands (e.g. STATS) whose
 * in-scope columns can be defined after the cursor
 * @returns
 */
export function getQueryForFields(
  queryString: string,
  root: ESQLAstQueryExpression,
  options?: { fullText?: string; cursorOffset?: number }
): ESQLAstQueryExpression {
  const lastCommand = root.commands[root.commands.length - 1];
  const columnsInScope =
    lastCommand && esqlCommandRegistry.getCommandMethods(lastCommand.name)?.columnsInScope;

  return (
    columnsInScope?.({
      root,
      queryString,
      fullText: options?.fullText ?? queryString,
      cursorOffset: options?.cursorOffset,
    }) ?? queryUntilPreviousCommand(root)
  );
}
