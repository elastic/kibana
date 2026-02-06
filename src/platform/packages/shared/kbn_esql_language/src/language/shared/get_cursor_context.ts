/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Walker, within } from '../../ast';
import { pipePrecedesCurrentWord } from '../../commands/definitions/utils';
import { findAstPosition } from '../../commands/definitions/utils/ast';
import type { ESQLAstQueryExpression } from '../../types';
import { findSubquery } from './subqueries_helpers';

/**
 * Given a ES|QL query string, its AST and the cursor position,
 * it returns the type of context for the position ("list", "function", "option", "setting", "expression", "newCommand")
 * plus the whole hierarchy of nodes (command, option, setting and actual position node) context.
 *
 * Type details:
 * * "list": the cursor is inside a "in" list of values (i.e. `a in (1, 2, <here>)`)
 * * "function": the cursor is inside a function call (i.e. `fn(<here>)`)
 * * "expression": the cursor is inside a command expression (i.e. `command ... <here>` or `command a = ... <here>`)
 * * "newCommand": the cursor is at the beginning of a new command (i.e. `command1 | command2 | <here>`)
 */
export function getCursorContext(
  queryString: string,
  queryAst: ESQLAstQueryExpression,
  offset: number
) {
  const { subQuery, queryContainsSubqueries } = findSubquery(queryAst, offset);
  const astForContext = subQuery ?? queryAst;
  const isCursorInSubquery = subQuery !== null;

  let inComment = false;

  Walker.visitComments(queryAst, (node) => {
    // if the cursor (offset) is within the range of a comment node
    if (within(offset, node)) {
      inComment = true;
      // or if the cursor (offset) is right after a single-line comment (which means there was no newline)
    } else if (
      node.subtype === 'single-line' &&
      node.location &&
      offset === node.location.max + 1
    ) {
      inComment = true;
    }
  });

  if (inComment) {
    return {
      type: 'comment' as const,
      isCursorInSubquery,
      queryContainsSubqueries,
      astForContext,
    };
  }

  const { command, option, node, containingFunction } = findAstPosition(astForContext, offset);
  if (
    !command ||
    (queryString.length <= offset &&
      pipePrecedesCurrentWord(queryString) &&
      command.location.max < queryString.length)
  ) {
    //   // ... | <here>
    return {
      type: 'newCommand' as const,
      command: undefined,
      node,
      option,
      containingFunction,
      isCursorInSubquery,
      queryContainsSubqueries,
      astForContext,
    };
  }

  // command a ... <here> OR command a = ... <here>
  return {
    type: 'expression' as const,
    command,
    containingFunction,
    option,
    node,
    isCursorInSubquery,
    queryContainsSubqueries,
    astForContext,
  };
}
