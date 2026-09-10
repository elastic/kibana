/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '@elastic/esql';
import type { ESQLAstExpression, ESQLAstItem, ESQLStringLiteral } from '@elastic/esql/types';
import { esqlColumn } from './esql_column';

/**
 * ES|QL expression nodes built with the AST `Builder` rather than composed with
 * the `esql.exp` tagged template.
 *
 * The template prints each interpolated node on its own and glues the pieces
 * together as text before re-parsing, which loses the grouping a nested operand
 * carried: combining `a == 1` with `b == 2 OR c == 3` yields
 * `a == 1 AND b == 2 OR c == 3`, and because `AND` binds tighter than `OR` that
 * re-associates to `(a == 1 AND b == 2) OR c == 3`. Building the tree here keeps
 * the shape, and printing a whole tree is safe because the printer parenthesizes
 * wherever precedence requires it.
 *
 * Pass the result to `ComposerQuery.where` as a single interpolated node, so the
 * clause is printed and re-parsed as one expression. That round trip also leaves
 * the query holding its own copy of the tree, so one memoized clause can feed
 * several queries without them sharing nodes.
 */

/**
 * An array guaranteed to hold at least one element. Build one by annotating an
 * accumulator that already contains its first element; `push` still works, while
 * passing a possibly-empty `T[]` fails to compile.
 *
 *     const conditions: NonEmptyArray<ESQLAstExpression> = [first];
 *     if (optional) conditions.push(second);
 */
export type NonEmptyArray<T> = [T, ...T[]];

/** Narrows a mapped array so it can flow into `esqlAnd`, `esqlOr` or `esqlIn`. */
export const isNonEmptyArray = <T>(values: T[]): values is NonEmptyArray<T> => values.length > 0;

/** A string literal node; the printer escapes the value. */
export const esqlString = (value: string): ESQLStringLiteral =>
  Builder.expression.literal.string(value);

export const esqlEquals = (field: string, value: string): ESQLAstExpression =>
  Builder.expression.func.binary('==', [esqlColumn(field), esqlString(value)]);

/** A function call such as `MATCH(col, "value")` or `KQL("...")`. */
export const esqlFunction = (name: string, args: ESQLAstItem[]): ESQLAstExpression =>
  Builder.expression.func.call(name, args);

/** Combines expressions into one `AND` node, preserving each operand's grouping. */
export const esqlAnd = (expressions: NonEmptyArray<ESQLAstExpression>): ESQLAstExpression =>
  expressions.reduce((left, right) => Builder.expression.func.binary('and', [left, right]));

/** Combines expressions into one `OR` node, preserving each operand's grouping. */
export const esqlOr = (expressions: NonEmptyArray<ESQLAstExpression>): ESQLAstExpression =>
  expressions.reduce((left, right) => Builder.expression.func.binary('or', [left, right]));

/**
 * `field IN ("a", "b")`. Uses a `tuple` list so the printer emits parentheses
 * (valid ES|QL) rather than the square brackets of a plain list literal. The
 * values are non-empty because `IN ()` does not parse.
 */
export const esqlIn = (field: string, values: NonEmptyArray<string>): ESQLAstExpression =>
  Builder.expression.func.binary('in', [
    esqlColumn(field),
    Builder.expression.list.tuple({ values: values.map(esqlString) }),
  ]);
