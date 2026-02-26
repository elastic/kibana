/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { within } from '../../../../../ast/location';
import type {
  PromQLAstNode,
  PromQLAstQueryExpression,
  PromQLBinaryExpression,
  PromQLFunction,
} from '../../../../../embedded_languages/promql/types';
import { PromqlWalker } from '../../../../../embedded_languages/promql/ast/walker';
import type { CursorContext, CursorMatch } from './types';

/** Single walker pass: finds narrowest node at cursor AND innermost function containing cursor. */
export function findCursorContext(root: PromQLAstQueryExpression, cursor: number): CursorContext {
  let match: CursorMatch | undefined;
  let innermostFunc: PromQLFunction | undefined;
  let outermostIncompleteBinary: PromQLBinaryExpression | undefined;

  if (!root.expression) {
    return { match: undefined, innermostFunc: undefined, outermostIncompleteBinary: undefined };
  }

  PromqlWalker.walk(root, {
    visitPromqlAny: (node, parent) => {
      const containsCursor =
        within(cursor, node) || (node.incomplete && cursor > node.location.max);

      if (!containsCursor) {
        return;
      }

      const span = node.location.max - node.location.min;
      const matchSpan = match ? match.node.location.max - match.node.location.min : Infinity;

      if (span <= matchSpan) {
        match = { node, parent: parent as PromQLAstNode | undefined };
      }

      if (node.type === 'function' && within(cursor, node)) {
        const funcSpan = innermostFunc
          ? innermostFunc.location.max - innermostFunc.location.min
          : Infinity;

        if (span <= funcSpan) {
          innermostFunc = node as PromQLFunction;
        }
      }

      // Track outermost incomplete binary expression for operator chains
      if (node.type === 'binary-expression') {
        const binary = node as PromQLBinaryExpression;

        if (binary.incomplete && binary.right.type === 'unknown') {
          const binarySpan = outermostIncompleteBinary
            ? outermostIncompleteBinary.location.max - outermostIncompleteBinary.location.min
            : -1;

          if (span > binarySpan) {
            outermostIncompleteBinary = binary;
          }
        }
      }
    },
  });

  return { match, innermostFunc, outermostIncompleteBinary };
}

/** Checks if cursor is after a complete top-level expression with trailing space. */
export function isAfterCompleteExpression(root: PromQLAstQueryExpression, cursor: number): boolean {
  const expr = root.expression;

  if (!expr || expr.incomplete) {
    return false;
  }

  if (expr.type !== 'function' && expr.type !== 'parens') {
    return false;
  }

  return cursor > expr.location.max + 1;
}

/** Checks if cursor is logically inside a grouping (including right after open paren). */
export function isCursorInsideGrouping(
  cursor: number,
  grouping: { location: { min: number; max: number }; args: unknown[] }
): boolean {
  if (within(cursor, grouping)) {
    return true;
  }

  // Right after open paren with empty args: `by (|`
  if (grouping.args.length === 0 && cursor === grouping.location.max + 1) {
    return true;
  }

  return false;
}
