/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLLocation, EditorError, ESQLAstBaseItem } from '../../types';

/**
 * All PromQL AST nodes have a `dialect: 'promql'` property to distinguish them
 * from ES|QL AST nodes.
 */
export interface PromQLAstNodeBase<Name = string> extends ESQLAstBaseItem<Name> {
  dialect: 'promql';
  name: Name;
  text: string;
  location: ESQLLocation;
  incomplete: boolean;
}

/**
 * Represents a complete PromQL query expression.
 */
export interface PromQLAstQueryExpression extends PromQLAstNodeBase<''> {
  type: 'query';
  /**
   * The main expression of the query. May be undefined for incomplete queries.
   */
  expression?: PromQLAstExpression;
}

/**
 * All possible PromQL expressions.
 */
export type PromQLAstExpression =
  | PromQLFunction
  | PromQLSelector
  | PromQLBinaryExpression
  | PromQLUnaryExpression
  | PromQLSubquery
  | PromQLParens
  | PromQLLiteral
  | PromQLIdentifier
  | PromQLUnknownItem;

/**
 * A PromQL AST node.
 */
export type PromQLAstNode =
  | PromQLAstQueryExpression
  | PromQLAstExpression
  | PromQLGrouping
  | PromQLLabelMap
  | PromQLLabel
  | PromQLEvaluation
  | PromQLOffset
  | PromQLAt
  | PromQLModifier
  | PromQLGroupModifier;

// ------------------------------------------------------- Function expressions

/**
 * Represents a PromQL function call.
 *
 * ```promql
 * rate(http_requests_total[5m])
 * sum by (job) (rate(http_requests_total[5m]))
 * avg (cpu_usage) without (instance)
 * ```
 */
export interface PromQLFunction extends PromQLAstNodeBase {
  type: 'function';

  /**
   * Function arguments, with at least one argument, unless the
   * function is incomplete.
   */
  args: PromQLAstExpression[];

  /**
   * Optional grouping clause (BY or WITHOUT).
   */
  grouping?: PromQLGrouping;

  /**
   * Position of the grouping clause relative to the function arguments.
   *
   * - `'before'`: `sum by (job) (...)` - grouping appears before the arguments
   * - `'after'`: `sum(...) by (job)` - grouping appears after the arguments
   *
   * Only set when `grouping` is defined.
   */
  groupingPosition?: 'before' | 'after';
}

/**
 * Represents grouping modifiers in aggregation functions.
 *
 * ```promql
 * sum by (job, instance) (...)
 * avg (...) without (cpu)
 * ```
 */
export interface PromQLGrouping extends PromQLAstNodeBase<'by' | 'without'> {
  type: 'grouping';
  args: PromQLLabelName[];
}

// --------------------------------------------------------------------- Labels

/**
 * Represents a label matcher in a selector.
 *
 * ```promql
 * {job="api", status=~"5.."}
 * ```
 */
export interface PromQLLabel extends PromQLAstNodeBase {
  type: 'label';

  /**
   * The label name.
   */
  labelName: PromQLLabelName;

  /**
   * The match operator: =, !=, =~, !~
   */
  operator: PromQLLabelMatchOperator;

  /**
   * The label value (string literal).
   */
  value?: PromQLStringLiteral;
}

export type PromQLLabelMatchOperator = '=' | '!=' | '=~' | '!~';

/**
 * Represents a label name which can be an identifier, string, or number.
 */
export type PromQLLabelName = PromQLIdentifier | PromQLStringLiteral | PromQLNumericLiteral;

/**
 * Represents the label map (curly braces with label matchers) in a selector.
 *
 * ```promql
 * {}
 * {job="api"}
 * {job="api", status=~"5.."}
 * ```
 */
export interface PromQLLabelMap extends PromQLAstNodeBase<''> {
  type: 'label-map';

  /**
   * The label matchers inside the curly braces.
   */
  args: PromQLLabel[];
}

// ------------------------------------------------------- Selector expressions

/**
 * Represents a PromQL selector (instant vector or range vector).
 *
 * @example
 * ```promql
 * {}
 * {label1="value1"}
 * {label1="value1", label2!="value2"}
 * {label1="value1", label2!="value2"}[]
 * {label1="value1", label2!="value2"}[5m]
 * http_requests_total
 * http_requests_total{}
 * http_requests_total{label="value", label2!="value2"}
 * http_requests_total{job="api"}[]
 * http_requests_total{job="api"}[5m]
 * http_requests_total{job="api"}[5m] offset - 5m
 * http_requests_total{job="api"}[5m] offset - 123 at - 5m
 * ```
 */
export interface PromQLSelector extends PromQLAstNodeBase {
  type: 'selector';

  /**
   * The metric name (can be empty for label-only selectors).
   */
  metric?: PromQLIdentifier;

  /**
   * Label map containing label matchers in curly braces.
   */
  labelMap?: PromQLLabelMap;

  /**
   * Optional range duration in square brackets.
   * Makes this a range vector selector.
   */
  duration?: PromQLAstExpression;

  /**
   * Optional evaluation modifiers (offset and @).
   */
  evaluation?: PromQLEvaluation;

  /**
   * All children of the selector in order: [metric?, labelMap?, duration?, evaluation?].
   * Undefined elements are not included in the array.
   */
  args: Array<PromQLIdentifier | PromQLLabelMap | PromQLAstExpression | PromQLEvaluation>;
}

/**
 * Represents evaluation modifiers: offset and @ timestamp.
 *
 * ```promql
 * http_requests_total offset 5m
 * http_requests_total @ 1609459200
 * http_requests_total offset 5m @ 1609459200
 * ```
 */
export interface PromQLEvaluation extends PromQLAstNodeBase<'evaluation'> {
  type: 'evaluation';
  offset?: PromQLOffset;
  at?: PromQLAt;
}

/**
 * Represents an offset modifier.
 *
 * ```promql
 * offset 5m
 * offset -5m
 * ```
 */
export interface PromQLOffset extends PromQLAstNodeBase<'offset'> {
  type: 'offset';
  negative: boolean;
  duration: PromQLAstExpression;
}

/**
 * Represents an @ timestamp modifier.
 *
 * ```promql
 * @ 1609459200
 * @ start()
 * @ end()
 * ```
 */
export interface PromQLAt extends PromQLAstNodeBase<'at'> {
  type: 'at';
  negative: boolean;
  value: PromQLTimeValue | PromQLAtModifier;
}

export type PromQLAtModifier = 'start()' | 'end()';

/**
 * Represents a binary expression in PromQL.
 *
 * ```promql
 * a + b
 * a == bool b
 * a * on(job) b
 * ```
 */
export interface PromQLBinaryExpression<Name extends PromQLBinaryOperator = PromQLBinaryOperator>
  extends PromQLAstNodeBase<Name> {
  type: 'binary-expression';
  left: PromQLAstExpression;
  right: PromQLAstExpression;

  /**
   * For comparison operators, whether BOOL modifier is present.
   */
  bool?: boolean;

  /**
   * Optional vector matching modifier.
   */
  modifier?: PromQLModifier;
}

export type PromQLBinaryOperator =
  | PromQLArithmeticOperator
  | PromQLComparisonOperator
  | PromQLSetOperator;

export type PromQLArithmeticOperator = '+' | '-' | '*' | '/' | '%' | '^';
export type PromQLComparisonOperator = '==' | '!=' | '>' | '>=' | '<' | '<=';
export type PromQLSetOperator = 'and' | 'or' | 'unless';

/**
 * Represents vector matching modifiers.
 *
 * ```promql
 * a + on(job) b
 * a + ignoring(instance) group_left(job) b
 * ```
 */
export interface PromQLModifier extends PromQLAstNodeBase<'on' | 'ignoring'> {
  type: 'modifier';
  labels: PromQLLabelName[];
  groupModifier?: PromQLGroupModifier;
}

/**
 * Represents group_left or group_right modifier.
 */
export interface PromQLGroupModifier extends PromQLAstNodeBase<'group_left' | 'group_right'> {
  type: 'group-modifier';
  labels: PromQLLabelName[];
}

/**
 * Represents a unary expression in PromQL.
 *
 * ```promql
 * -vector
 * +vector
 * ```
 */
export interface PromQLUnaryExpression extends PromQLAstNodeBase<'+' | '-'> {
  type: 'unary-expression';
  arg: PromQLAstExpression;
}

/**
 * Represents a subquery expression.
 *
 * ```promql
 * rate(http_requests_total[5m])[30m:1m]
 * ```
 */
export interface PromQLSubquery extends PromQLAstNodeBase<'subquery'> {
  type: 'subquery';
  expr: PromQLAstExpression;
  range: PromQLAstExpression;
  resolution?: PromQLAstExpression;
  evaluation?: PromQLEvaluation;
}

/**
 * Represents a parenthesized expression.
 *
 * ```promql
 * (a + b)
 * ```
 */
export interface PromQLParens extends PromQLAstNodeBase<''> {
  type: 'parens';
  child: PromQLAstExpression;
}

// ------------------------------------------------------------------- literals

export type PromQLLiteral = PromQLNumericLiteral | PromQLStringLiteral | PromQLTimeValue;

/**
 * Represents a numeric literal (integer, decimal, or hexadecimal).
 */
export interface PromQLNumericLiteral extends PromQLAstNodeBase {
  type: 'literal';
  literalType: 'integer' | 'decimal' | 'hexadecimal';
  value: number;
}

/**
 * Represents a string literal.
 */
export interface PromQLStringLiteral extends PromQLAstNodeBase {
  type: 'literal';
  literalType: 'string';
  value: string;
  valueUnquoted: string;
}

/**
 * Represents a time/duration value.
 *
 * ```promql
 * 5m
 * 1h30m
 * :5m
 * ```
 */
export interface PromQLTimeValue extends PromQLAstNodeBase {
  type: 'literal';
  literalType: 'time';
  value: string;
}

// -------------------------------------------------------- miscellaneous nodes

/**
 * Represents an identifier (metric name, label name, function name).
 */
export interface PromQLIdentifier extends PromQLAstNodeBase {
  type: 'identifier';
}

/**
 * Represents an unknown or unrecognized item in the AST.
 */
export interface PromQLUnknownItem extends PromQLAstNodeBase<'unknown'> {
  type: 'unknown';
}

// ---------------------------------------------------------------------- other

/**
 * Result of parsing a PromQL query.
 */
export interface PromQLParseResult<T extends PromQLAstNode = PromQLAstQueryExpression> {
  /**
   * The root node of the parsed tree.
   */
  root: T;

  /**
   * List of parsing errors.
   */
  errors: EditorError[];
}

/**
 * Result of PromQL AST position detection (via PromqlWalker).
 */
export interface PromQLPositionResult {
  /**
   * The deepest node containing the offset.
   */
  node: PromQLAstNode | undefined;

  /**
   * Parent node of the current node.
   */
  parent: PromQLAstNode | undefined;
}
