/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstExpression, ESQLAstItem, ESQLCommand } from '@elastic/esql/types';
import {
  BasicPrettyPrinter,
  isColumn,
  isCommand,
  isFunctionExpression,
  isHeaderCommand,
  isParens,
  isProperNode,
  mutate,
  Parser,
  Walker,
} from '@elastic/esql';

const isAstExpression = (node: unknown): node is ESQLAstExpression =>
  isProperNode(node) && !isCommand(node) && !isHeaderCommand(node);

const toExpression = (item: ESQLAstItem | undefined): ESQLAstExpression | undefined => {
  if (item === undefined) {
    return undefined;
  }
  if (Array.isArray(item)) {
    return item.find(isAstExpression);
  }
  return isAstExpression(item) ? item : undefined;
};

const isBooleanCombinator = (expression: ESQLAstExpression): boolean =>
  isFunctionExpression(expression) && (expression.name === 'and' || expression.name === 'or');

const expressionReferencesSelectedDimension = (
  expression: ESQLAstExpression,
  selectedDimensions: Set<string>
): boolean =>
  Walker.find(expression, (node) => isColumn(node) && selectedDimensions.has(node.name)) !==
  undefined;

/**
 * Drops WHERE predicate subtrees that reference a selected dimension by column name.
 *
 * Used only for the METRICS_INFO capability source: the parent Discover query and generated
 * chart queries keep the full user filter. AND/OR sides are promoted when one side is removed;
 * a WHERE command is removed when its expression becomes empty.
 *
 * Best-effort for Discover Metrics journeys — aliases (`EVAL d = dim | WHERE d …`) and opaque
 * query languages (`KQL(...)`) are not resolved and are left unchanged.
 */
export function stripSelectedDimensionWherePredicates(
  query?: string,
  selectedDimensionNames?: string[]
): string | undefined {
  if (!query || !selectedDimensionNames?.length) {
    return query;
  }

  const { root, errors } = Parser.parse(query);
  if (errors.length > 0) {
    return query;
  }

  const selectedDimensions = new Set(selectedDimensionNames);
  let changed = false;
  const emptyWhereCommands: ESQLCommand[] = [];

  for (const command of root.commands) {
    if (command.name !== 'where') {
      continue;
    }

    const expression = toExpression(command.args[0]);
    if (expression === undefined) {
      continue;
    }

    const stripped = stripDimensionPredicatesFromExpression(expression, selectedDimensions);
    if (stripped === expression) {
      continue;
    }

    changed = true;
    if (stripped === undefined) {
      emptyWhereCommands.push(command);
      continue;
    }

    command.args[0] = stripped;
  }

  if (!changed) {
    return query;
  }

  emptyWhereCommands.forEach((command) => mutate.generic.commands.remove(root, command));
  return BasicPrettyPrinter.print(root);
}

const stripDimensionPredicatesFromExpression = (
  expression: ESQLAstExpression,
  selectedDimensions: Set<string>
): ESQLAstExpression | undefined => {
  if (isParens(expression)) {
    const strippedChild = stripDimensionPredicatesFromExpression(
      expression.child,
      selectedDimensions
    );
    if (strippedChild === undefined) {
      return undefined;
    }
    if (strippedChild === expression.child) {
      return expression;
    }
    return { ...expression, child: strippedChild };
  }

  if (isBooleanCombinator(expression) && isFunctionExpression(expression)) {
    const [leftArg, rightArg] = expression.args;
    const leftExpression = toExpression(leftArg);
    const rightExpression = toExpression(rightArg);

    if (leftExpression === undefined || rightExpression === undefined) {
      return expressionReferencesSelectedDimension(expression, selectedDimensions)
        ? undefined
        : expression;
    }

    const left = stripDimensionPredicatesFromExpression(leftExpression, selectedDimensions);
    const right = stripDimensionPredicatesFromExpression(rightExpression, selectedDimensions);

    if (left === undefined && right === undefined) {
      return undefined;
    }
    if (left === undefined) {
      return right;
    }
    if (right === undefined) {
      return left;
    }
    if (left === leftExpression && right === rightExpression) {
      return expression;
    }
    return { ...expression, args: [left, right] };
  }

  if (expressionReferencesSelectedDimension(expression, selectedDimensions)) {
    return undefined;
  }

  return expression;
};
