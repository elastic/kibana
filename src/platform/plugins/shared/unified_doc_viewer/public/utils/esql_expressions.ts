/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '@elastic/esql';
import type { ComposerQuery } from '@elastic/esql';
import type { ESQLAstExpression, ESQLAstItem, ESQLStringLiteral } from '@elastic/esql/types';
import { esqlColumn } from './esql_column';

/**
 * Build ES|QL expression nodes directly with the AST `Builder` instead of the
 * `esql.exp` / `query.where` tagged templates.
 *
 * The tagged templates print every interpolated node to text and re-parse the
 * whole expression. That round trip corrupts string literals whose value
 * contains a backslash followed by `r`, `n` or `t` (e.g. Windows paths like
 * `handlers\run.cs`): the parser's decoder treats the escaped backslash plus
 * the following letter as a single control-character escape. Constructing the
 * AST here keeps values as literal nodes that are only escaped once, at print
 * time, matching the pre-migration behavior that resolved params after parsing.
 */

/** A string literal node, escaped only once at print time (never re-parsed). */
export const esqlString = (value: string): ESQLStringLiteral =>
  Builder.expression.literal.string(value);

/** `field == "value"` with `value` carried as a literal node (never re-parsed). */
export const esqlEquals = (field: string, value: string): ESQLAstExpression =>
  Builder.expression.func.binary('==', [esqlColumn(field), esqlString(value)]);

/** A variadic function call such as `MATCH(col, "value")` or `KQL("...")`. */
export const esqlFunction = (name: string, args: ESQLAstItem[]): ESQLAstExpression =>
  Builder.expression.func.call(name, args);

/** Combine expressions with `AND`, matching the left-associative shape the printer emits. */
export const esqlAnd = (expressions: ESQLAstExpression[]): ESQLAstExpression =>
  expressions.reduce((left, right) => Builder.expression.func.binary('and', [left, right]));

/** Combine expressions with `OR`, matching the left-associative shape the printer emits. */
export const esqlOr = (expressions: ESQLAstExpression[]): ESQLAstExpression =>
  expressions.reduce((left, right) => Builder.expression.func.binary('or', [left, right]));

/**
 * `field IN ("a", "b")`. Uses a `tuple` list so the printer emits parentheses
 * (valid ES|QL) rather than the square brackets of a plain list literal.
 */
export const esqlIn = (field: string, values: string[]): ESQLAstExpression =>
  Builder.expression.func.binary('in', [
    esqlColumn(field),
    Builder.expression.list.tuple({ values: values.map(esqlString) }),
  ]);

/**
 * Append a `WHERE` command built from an AST node.
 *
 * `ComposerQuery.where` re-parses the printed clause and would reintroduce the
 * literal corruption described above, so we push the command onto the AST
 * directly. Mutates `query` in place, like the `ComposerQuery` methods.
 */
export const appendWhereCommand = (query: ComposerQuery, clause: ESQLAstExpression): void => {
  query.ast.commands.push(Builder.command({ name: 'where', args: [clause] }));
};
