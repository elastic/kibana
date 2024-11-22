/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstBaseItem, ESQLProperNode } from '../types';
import { Walker } from '../walker';

export interface QueryPrettyPrintStats {
  /**
   * `true` if the given AST has a line breaking decoration. A line breaking
   * decoration is any decoration that requires a newline "\n" to be printed.
   */
  hasLineBreakingDecorations: boolean;

  /**
   * Whether the given AST has at least one single line comment to the right of
   * some node.
   */
  hasRightSingleLineComments: boolean;
}

/**
 * Walks once the given AST sub-tree and computes the pretty print stats.
 *
 * @param ast The part to compute the stats for.
 */
export const getPrettyPrintStats = (ast: ESQLProperNode): QueryPrettyPrintStats => {
  const stats: QueryPrettyPrintStats = {
    hasLineBreakingDecorations: false,
    hasRightSingleLineComments: false,
  };

  Walker.walk(ast, {
    visitAny: (node) => {
      if (hasLineBreakingDecoration(node)) {
        stats.hasLineBreakingDecorations = true;
      }
      if (!!node.formatting?.rightSingleLine) {
        stats.hasRightSingleLineComments = true;
      }
    },
  });

  return stats;
};

export const hasLineBreakingDecoration = (node: ESQLAstBaseItem): boolean => {
  const formatting = node.formatting;

  if (!formatting) {
    return false;
  }

  if (
    (!!formatting.top && formatting.top.length > 0) ||
    (!!formatting.bottom && formatting.bottom.length > 0) ||
    !!formatting.rightSingleLine
  ) {
    return true;
  }

  for (const decoration of [...(formatting.left ?? []), ...(formatting.right ?? [])]) {
    if (
      decoration.type === 'comment' &&
      decoration.subtype === 'multi-line' &&
      !decoration.text.includes('\n')
    ) {
      continue;
    }
    return true;
  }

  return false;
};
