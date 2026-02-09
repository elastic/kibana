/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isSubQuery, within, Walker } from '../../ast';
import type { ESQLAstQueryExpression } from '../../types';

/**
 * Finds the innermost subquery containing the cursor position and determines if the query contains subqueries.
 *
 * Example: FROM a, (FROM b, (FROM c | WHERE |))
 *                                        ↑ cursor
 * Returns: { subQuery: ESQLAstQueryExpression for "FROM c | WHERE", queryContainsSubqueries: true }
 */
export function findSubquery(
  queryAst: ESQLAstQueryExpression,
  offset: number
): { subQuery: ESQLAstQueryExpression | null; queryContainsSubqueries: boolean } {
  let subQuery: ESQLAstQueryExpression | null = null;
  let queryContainsSubqueries = false;

  // Check if query contains subqueries while walking the AST
  const allCommands = Walker.commands(queryAst);
  const fromCommands = allCommands.filter(({ name }) => name.toLowerCase() === 'from');
  queryContainsSubqueries = fromCommands.some((cmd) => cmd.args.some((arg) => isSubQuery(arg)));

  Walker.walk(queryAst, {
    visitParens: (node, parent) => {
      const isForkBranch = parent?.type === 'command' && parent.name === 'fork';

      if (isSubQuery(node) && within(offset, node) && !isForkBranch) {
        const candidate = node.child;

        // Skip non-ES|QL subqueries (e.g. PromQL nodes) which don't have commands.
        if (candidate?.commands && candidate.commands.length > 0) {
          subQuery = candidate;
        }
      }
    },
  });

  return { subQuery, queryContainsSubqueries };
}
