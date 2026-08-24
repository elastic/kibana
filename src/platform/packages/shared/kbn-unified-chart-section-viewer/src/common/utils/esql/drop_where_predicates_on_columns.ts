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

const expressionReferencesColumns = (
  expression: ESQLAstExpression,
  columnNames: Set<string>
): boolean =>
  Walker.find(expression, (node) => isColumn(node) && columnNames.has(node.name)) !== undefined;

const dropPredicatesFromExpression = (
  expression: ESQLAstExpression,
  columnNames: Set<string>
): ESQLAstExpression | undefined => {
  if (isParens(expression)) {
    const strippedChild = dropPredicatesFromExpression(expression.child, columnNames);
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
      return expressionReferencesColumns(expression, columnNames) ? undefined : expression;
    }

    const left = dropPredicatesFromExpression(leftExpression, columnNames);
    const right = dropPredicatesFromExpression(rightExpression, columnNames);

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

  if (expressionReferencesColumns(expression, columnNames)) {
    return undefined;
  }

  return expression;
};

/**
 * True when any WHERE command references one of `columnNames`.
 * Aliases and `KQL(...)` are not resolved.
 */
export function whereMentionsColumns(
  query: string | undefined,
  columnNames: string[] | undefined
): boolean {
  if (!query || !columnNames?.length) {
    return false;
  }

  const { root, errors } = Parser.parse(query);
  if (errors.length > 0) {
    return false;
  }

  const names = new Set(columnNames);
  return root.commands.some((command) => {
    if (command.name !== 'where') {
      return false;
    }
    const expression = toExpression(command.args[0]);
    return expression !== undefined && expressionReferencesColumns(expression, names);
  });
}

/**
 * Removes WHERE predicates that mention any of `columnNames`.
 * AND/OR sides are promoted when one side is dropped; a WHERE command is
 * removed when nothing remains. Used to build the capability METRICS_INFO source.
 */
export function dropWherePredicatesOnColumns(
  query: string | undefined,
  columnNames: string[] | undefined
): string | undefined {
  if (!query || !columnNames?.length) {
    return query;
  }

  const { root, errors } = Parser.parse(query);
  if (errors.length > 0) {
    return query;
  }

  const names = new Set(columnNames);
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

    const stripped = dropPredicatesFromExpression(expression, names);
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
