/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ICommandContext } from '../../commands_registry/types';
import type { ESQLAstItem, ESQLSingleAstItem } from '../../types';
import { Walker } from '../../walker';
import { getExpressionType, isExpressionComplete } from './expressions';
import {
  comparisonFunctions,
  specialOperators,
  nullCheckOperators,
  logicalOperators as logicalOperatorsList,
} from '../all_operators';

export const COMPARISON_OPS = new Set(comparisonFunctions.map((f) => String(f.name).toUpperCase()));
export const SPECIAL_OPERATORS = new Set(specialOperators.map((f) => String(f.name).toUpperCase()));
export const NULL_CHECK_OPERATORS = new Set(
  nullCheckOperators.map((f) => String(f.name).toUpperCase())
);
export const LOGICAL_OPERATORS = new Set(
  logicalOperatorsList.map((f) => String(f.name).toUpperCase())
);
export const TERMINAL_REQUIRES_SECOND = new Set<string>([
  ...Array.from(COMPARISON_OPS),
  ...Array.from(SPECIAL_OPERATORS),
]);

/**
 * Convenience wrapper: is this boolean expression effectively complete?
 *
 * Example:
 * - RERANK: the RHS of ON assignments often passes the whole RHS rather than the
 * caret-scoped sub-expression. Set traverseRightmost=true to pick the rightmost
 * non-variadic operator (the one being edited) and judge completeness against it.
 * - EVAL/WHERE: the validation layer already routes a caret-scoped, sanitized root,
 * so traverseRightmost=false is sufficient (type + isExpressionComplete). They can
 * still use this helper to centralize rules (null checks, terminals), but it’s optional.
 */
export function isBooleanExpressionFinished(
  root: ESQLSingleAstItem | undefined,
  innerText: string,
  context?: ICommandContext,
  options: { traverseRightmost?: boolean } = {}
): boolean {
  if (!root) {
    return false;
  }

  const node = options.traverseRightmost ? getRightmostNonVariadicOperator(root) : root;
  return isBooleanFinished(node, innerText, context);
}

function isBooleanFinished(
  node: ESQLSingleAstItem,
  innerText: string,
  context?: ICommandContext
): boolean {
  const exprType = getExpressionType(node, context?.fields, context?.userDefinedColumns);
  const completeByType = exprType === 'boolean' && isExpressionComplete(exprType, innerText);
  if (completeByType) {
    return true;
  }

  if (node.type !== 'function') {
    return false;
  }

  const fn = node;
  const op = String(fn.name).toUpperCase();
  const args = fn.args || [];

  if (TERMINAL_REQUIRES_SECOND.has(op)) {
    const second = firstAstItem(args[1]);
    return Boolean(second) && !second?.incomplete;
  }

  if (NULL_CHECK_OPERATORS.has(op)) {
    return true;
  }

  if (LOGICAL_OPERATORS.has(op)) {
    const right = firstAstItem(args[1]);
    if (!right || right.incomplete) {
      return false;
    }
    const rightmostRight = getRightmostNonVariadicOperator(right);
    return isBooleanFinished(rightmostRight, innerText, context);
  }

  return false;
}

function getRightmostNonVariadicOperator(root: ESQLSingleAstItem): ESQLSingleAstItem {
  if (root?.type !== 'function') {
    return root;
  }

  let rightmostFn = root;
  const walker = new Walker({
    visitFunction: (fn) => {
      if (fn.subtype !== 'variadic-call' && fn.location.min > rightmostFn.location.min) {
        rightmostFn = fn;
      }
    },
  });

  walker.walkFunction(root);

  return rightmostFn;
}

function firstAstItem(arg: ESQLAstItem | undefined) {
  return arg ? ((Array.isArray(arg) ? arg[0] : arg) as ESQLSingleAstItem | undefined) : undefined;
}
