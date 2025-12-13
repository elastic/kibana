/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstBaseItem } from '../types';

/**
 * Base interface for all PromQL AST nodes. Extends the ES|QL base item with
 * a dialect discriminator to distinguish PromQL nodes from ES|QL nodes.
 *
 * @example
 * ```typescript
 * const node: PromQLAstBaseItem = {
 *   dialect: 'promql', // <-- dialect discriminator
 *   type: 'literal',
 *   name: '42',
 *   text: '42',
 *   location: { min: 0, max: 2 },
 *   incomplete: false
 * };
 * ```
 */
export interface PromQLAstBaseItem<Name extends string = string> extends ESQLAstBaseItem<Name> {
  /**
   * Dialect discriminator to identify PromQL nodes.
   */
  dialect: 'promql';
}

/**
 * Union type of all PromQL AST nodes.
 */
export type PromQLAstNode = PromQLExpression | PromQLLiteral | PromQLSelector;

/**
 * Union type of all PromQL expression nodes.
 */
export type PromQLExpression =
  | PromQLAggregateExpr
  | PromQLBinaryExpr
  | PromQLUnaryExpr
  | PromQLCall
  | PromQLParens
  | PromQLSubqueryExpr
  | PromQLStepInvariantExpr
  | PromQLLiteral
  | PromQLSelector;

/**
 * Union type of all PromQL literal nodes.
 */
export type PromQLLiteral = PromQLNumberLiteral | PromQLStringLiteral | PromQLDurationLiteral;

/**
 * Union type of all PromQL selector nodes (instant and range vectors).
 */
export type PromQLSelector = PromQLVectorSelector | PromQLMatrixSelector;

// ============================================================================
// Literal Types
// ============================================================================

/**
 * Represents a numeric literal in PromQL.
 *
 * PromQL supports integers, floating-point numbers, and scientific notation.
 *
 * @example
 * ```promql
 * 42
 * 3.14
 * -5
 * 1.23e-4
 * 6.022e23
 * ```
 */
export interface PromQLNumberLiteral extends PromQLAstBaseItem {
  type: 'literal';
  literalType: 'promql-number';

  /**
   * The numeric value.
   */
  value: number;
}

/**
 * Represents a string literal in PromQL.
 *
 * PromQL supports three quote styles: double quotes, single quotes, and backticks.
 * Strings are primarily used in label matchers and function arguments.
 *
 * @example
 * ```promql
 * "double quoted"
 * 'single quoted'
 * `backtick quoted`
 * ```
 */
export interface PromQLStringLiteral extends PromQLAstBaseItem {
  type: 'literal';
  literalType: 'promql-string';

  /**
   * The string value (without quotes).
   */
  value: string;

  /**
   * The original quote style used in the source.
   * Preserved for accurate pretty-printing.
   */
  quoteStyle?: 'double' | 'single' | 'backtick';
}

/**
 * Represents a duration/time literal in PromQL.
 *
 * Durations are used for range selectors, offset modifiers, and time-based functions.
 * Supported units: ms, s, m, h, d, w, y
 *
 * @example
 * ```promql
 * 5m      // 5 minutes
 * 1h      // 1 hour
 * 30s     // 30 seconds
 * 2d      // 2 days
 * 1w      // 1 week
 * ```
 */
export interface PromQLDurationLiteral extends PromQLAstBaseItem {
  type: 'literal';
  literalType: 'promql-duration';

  /**
   * The full duration string as it appears in source (e.g., "5m", "1h30m").
   */
  value: string;

  /**
   * The numeric quantity of the duration.
   */
  quantity: number;

  /**
   * The time unit: ms, s, m, h, d, w, y
   */
  unit: string;

  /**
   * The duration converted to milliseconds for easier computation.
   */
  milliseconds: number;
}

/**
 * Represents an identifier in PromQL (metric names, label names, function names).
 *
 * Identifiers follow the regex: [a-zA-Z_:][a-zA-Z0-9_:]*
 * Metric names may contain colons for recording rules.
 *
 * @example
 * ```promql
 * http_requests_total
 * job
 * instance
 * rate
 * :node_cpu:avg5m  // recording rule
 * ```
 */
export interface PromQLIdentifier extends PromQLAstBaseItem {
  type: 'identifier';
  dialect: 'promql';

  /**
   * The identifier name.
   */
  name: string;
}

// ============================================================================
// Selector Types
// ============================================================================

/**
 * Represents a label matcher used in vector selectors.
 *
 * Label matchers filter time series by their label values using various operators.
 *
 * @example
 * ```promql
 * job="api-server"           // exact match
 * handler!="/"               // not equal
 * method=~"GET|POST"         // regex match
 * status!~"5.."              // negative regex match
 * ```
 */
export interface PromQLLabelMatcher extends PromQLAstBaseItem {
  type: 'promql-label-matcher';

  /**
   * The label name being matched.
   */
  label: PromQLIdentifier;

  /**
   * The matching operator:
   * - `=`: exact string match
   * - `!=`: not equal
   * - `=~`: regex match
   * - `!~`: negative regex match
   */
  operator: '=' | '!=' | '=~' | '!~';

  /**
   * The value to match against (always a string literal).
   */
  value: PromQLStringLiteral;
}

/**
 * Represents an instant vector selector.
 *
 * Selects a set of time series at a single point in time.
 * Can include metric name, label matchers, and time modifiers.
 *
 * @example
 * ```promql
 * http_requests_total
 * http_requests_total{job="api-server"}
 * {job="api-server", handler="/api/comments"}
 * http_requests_total offset 5m
 * http_requests_total @ 1609746000
 * http_requests_total{job="api"} offset 5m @ 1609746000
 * ```
 */
export interface PromQLVectorSelector extends PromQLAstBaseItem {
  type: 'promql-selector';
  selectorType: 'vector';

  /**
   * The metric name (optional - can select by labels only).
   */
  metric?: PromQLIdentifier;

  /**
   * Label matchers to filter time series.
   * Empty array means no label filtering.
   */
  labelMatchers: PromQLLabelMatcher[];

  /**
   * Offset modifier: shifts the time window backward.
   *
   * @example
   * ```promql
   * http_requests_total offset 5m  // data from 5 minutes ago
   * ```
   */
  offset?: PromQLDurationLiteral;

  /**
   * @ modifier: evaluates the selector at a specific timestamp.
   * Can be a number literal (Unix timestamp) or a unary expression (e.g., -300).
   *
   * @example
   * ```promql
   * http_requests_total @ 1609746000      // at specific timestamp
   * http_requests_total @ end()           // at end of query range
   * http_requests_total @ start()         // at start of query range
   * ```
   */
  timestamp?: PromQLNumberLiteral | PromQLUnaryExpr;
}

/**
 * Represents a range vector selector (matrix selector).
 *
 * Selects a range of samples for each time series over a specified time window.
 * Used with functions like `rate()`, `increase()`, `avg_over_time()`, etc.
 *
 * @example
 * ```promql
 * http_requests_total[5m]
 * http_requests_total{job="api"}[1h]
 * http_requests_total[5m] offset 1d
 * ```
 */
export interface PromQLMatrixSelector extends PromQLAstBaseItem {
  type: 'promql-selector';
  selectorType: 'matrix';

  /**
   * The base vector selector defining which time series to select.
   */
  vectorSelector: PromQLVectorSelector;

  /**
   * The time range/window duration.
   */
  range: PromQLDurationLiteral;
}

// ============================================================================
// Expression Types
// ============================================================================

/**
 * PromQL binary operators grouped by category.
 */
export type PromQLBinaryOperator =
  | PromQLArithmeticOperator
  | PromQLComparisonOperator
  | PromQLLogicalOperator;

/**
 * Arithmetic operators in PromQL.
 *
 * Precedence (high to low):
 * 1. `^` (power)
 * 2. `*`, `/`, `%`, `atan2`
 * 3. `+`, `-`
 */
export type PromQLArithmeticOperator = '+' | '-' | '*' | '/' | '%' | '^';

/**
 * Comparison operators in PromQL.
 *
 * All comparison operators have the same precedence.
 * Can be modified with `bool` to return 0/1 instead of filtering.
 */
export type PromQLComparisonOperator = '==' | '!=' | '>' | '<' | '>=' | '<=';

/**
 * Logical/set operators in PromQL.
 *
 * Precedence (high to low):
 * 1. `unless`
 * 2. `and`
 * 3. `or`
 */
export type PromQLLogicalOperator = 'and' | 'or' | 'unless';

/**
 * Represents a binary expression in PromQL.
 *
 * Binary expressions combine two operands with an operator.
 * For vector-to-vector operations, additional matching semantics apply.
 *
 * @example
 * ```promql
 * // Arithmetic
 * foo + bar
 * foo / bar
 * foo ^ 2
 *
 * // Comparison
 * foo > 100
 * foo == bool bar  // returns 0 or 1
 *
 * // Logical/Set
 * foo and bar
 * foo or bar
 * foo unless bar
 *
 * // Vector matching
 * foo + on(instance) bar
 * foo / ignoring(job) bar
 * foo + on(instance) group_left(job) bar
 * ```
 */
export interface PromQLBinaryExpr extends PromQLAstBaseItem {
  type: 'function';
  subtype: 'binary-expression';
  dialect: 'promql';

  /**
   * The binary operator.
   */
  name: PromQLBinaryOperator;

  /**
   * Left and right operands.
   */
  args: [PromQLExpression, PromQLExpression];

  /**
   * Vector matching clause for vector-to-vector operations.
   * Specifies how to match time series between left and right operands.
   */
  vectorMatching?: PromQLVectorMatching;

  /**
   * Whether the comparison returns a boolean (0 or 1) instead of filtering.
   * Only valid for comparison operators.
   *
   * @example
   * ```promql
   * foo == bool bar  // returns 0 or 1
   * ```
   */
  returnBool?: boolean;
}

/**
 * Vector matching specification for binary operations between vectors.
 *
 * Determines how time series from left and right operands are matched.
 *
 * @example
 * ```promql
 * // One-to-one matching
 * foo + on(instance) bar
 * foo + ignoring(job) bar
 *
 * // Many-to-one matching
 * foo + on(instance) group_left(job) bar
 *
 * // One-to-many matching
 * foo + on(instance) group_right(job) bar
 * ```
 */
export interface PromQLVectorMatching extends PromQLAstBaseItem {
  type: 'promql-vector-matching';

  /**
   * Cardinality of the matching:
   * - `one-to-one`: each time series on left matches at most one on right
   * - `many-to-one`: many time series on left match one on right
   * - `one-to-many`: one time series on left matches many on right
   */
  card: 'one-to-one' | 'many-to-one' | 'one-to-many';

  /**
   * Matching clause specifies which labels to consider for matching.
   */
  matchingClause?: {
    /**
     * Type of matching:
     * - `on`: only consider these labels
     * - `ignoring`: ignore these labels, consider all others
     */
    type: 'on' | 'ignoring';

    /**
     * Label names to include/exclude.
     */
    labels: PromQLIdentifier[];
  };

  /**
   * Additional labels to include from the one side in many-to-one or one-to-many matching.
   * Used with `group_left` or `group_right`.
   */
  include?: PromQLIdentifier[];
}

/**
 * Represents a unary expression in PromQL.
 *
 * Unary operators apply to a single operand.
 * PromQL supports unary plus and minus.
 *
 * @example
 * ```promql
 * -foo      // negate
 * +foo      // no-op (explicit positive)
 * -1.5
 * -(foo + bar)
 * ```
 */
export interface PromQLUnaryExpr extends PromQLAstBaseItem {
  type: 'function';
  subtype: 'unary-expression';
  dialect: 'promql';

  /**
   * The unary operator: `-` (negation) or `+` (no-op).
   */
  name: '-' | '+';

  /**
   * The operand.
   */
  args: [PromQLExpression];
}

/**
 * Represents a function call in PromQL.
 *
 * PromQL has many built-in functions for rate calculation, aggregation over time,
 * mathematical operations, date/time, and more.
 *
 * @example
 * ```promql
 * rate(http_requests_total[5m])
 * round(foo, 10)
 * clamp_max(bar, 100)
 * histogram_quantile(0.95, rate(http_request_duration_bucket[5m]))
 * ```
 */
export interface PromQLCall extends PromQLAstBaseItem {
  type: 'function';
  subtype: 'variadic-call';
  dialect: 'promql';

  /**
   * The function name.
   */
  name: string;

  /**
   * Function arguments.
   */
  args: PromQLExpression[];
}

/**
 * PromQL aggregation operators.
 *
 * Aggregation operators reduce multiple time series into fewer time series
 * by grouping and applying an aggregation function.
 */
export type PromQLAggregationOperator =
  // Basic aggregations
  | 'sum'
  | 'min'
  | 'max'
  | 'avg'
  | 'group'
  | 'stddev'
  | 'stdvar'
  | 'count'
  | 'count_values'
  // Top-K/Bottom-K
  | 'bottomk'
  | 'topk'
  | 'limitk'
  | 'limit_ratio'
  // Quantiles
  | 'quantile'
  // Aggregations over time (for range vectors)
  | 'sum_over_time'
  | 'avg_over_time'
  | 'max_over_time'
  | 'min_over_time'
  | 'count_over_time'
  | 'stddev_over_time'
  | 'stdvar_over_time'
  | 'last_over_time'
  | 'present_over_time';

/**
 * Represents an aggregation expression in PromQL.
 *
 * Aggregations combine multiple time series into fewer series using
 * aggregation functions and optional grouping.
 *
 * @example
 * ```promql
 * sum(http_requests_total)
 * sum by(job) (http_requests_total)
 * avg without(instance) (cpu_usage)
 * topk(5, http_requests_total)
 * quantile(0.95, http_request_duration)
 * count_values("status", http_response_status)
 * sum_over_time(http_requests_total[5m])
 * ```
 */
export interface PromQLAggregateExpr extends PromQLAstBaseItem {
  type: 'promql-aggregate';

  /**
   * The aggregation operator.
   */
  operator: PromQLAggregationOperator;

  /**
   * The expression being aggregated.
   */
  expr: PromQLExpression;

  /**
   * Grouping clause specifying how to group time series.
   */
  grouping?: PromQLGrouping;

  /**
   * Parameter for parameterized aggregations:
   * - `topk(k, ...)`: k is the parameter
   * - `bottomk(k, ...)`: k is the parameter
   * - `quantile(φ, ...)`: φ is the parameter
   * - `count_values("label", ...)`: "label" is the parameter
   */
  param?: PromQLExpression;
}

/**
 * Represents a grouping clause in aggregations.
 *
 * Determines which labels to use for grouping time series.
 *
 * @example
 * ```promql
 * sum by(job, instance) (...)      // group by these labels
 * sum without(instance) (...)      // group by all labels except these
 * ```
 */
export interface PromQLGrouping extends PromQLAstBaseItem {
  type: 'promql-grouping';

  /**
   * Grouping clause type:
   * - `by`: group only by the specified labels
   * - `without`: group by all labels except the specified ones
   */
  clause: 'by' | 'without';

  /**
   * Label names to group by or exclude.
   */
  labels: PromQLIdentifier[];
}

/**
 * Represents a subquery expression in PromQL.
 *
 * Subqueries allow evaluating an instant query over a range and optional step.
 * The result is a range vector.
 *
 * @example
 * ```promql
 * rate(http_requests_total[5m])[1h:]
 * rate(http_requests_total[5m])[1h:5m]
 * max_over_time(rate(http_requests_total[5m])[1h:])
 * ```
 *
 * Syntax: `<expr>[<range>:<step>] offset <offset> @ <timestamp>`
 * - range: required
 * - step: optional (defaults to global step)
 * - offset: optional
 * - @: optional
 */
export interface PromQLSubqueryExpr extends PromQLAstBaseItem {
  type: 'promql-subquery';

  /**
   * The inner expression to evaluate as a subquery.
   */
  expr: PromQLExpression;

  /**
   * The time range over which to evaluate the subquery.
   */
  range: PromQLDurationLiteral;

  /**
   * Optional step/resolution for the subquery evaluation.
   * If not specified, uses the global step parameter.
   */
  step?: PromQLDurationLiteral;

  /**
   * Optional offset modifier to shift the time window.
   */
  offset?: PromQLDurationLiteral;

  /**
   * Optional @ modifier to evaluate at a specific timestamp.
   */
  timestamp?: PromQLNumberLiteral | PromQLUnaryExpr;
}

/**
 * Represents a step-invariant expression.
 *
 * Step-invariant expressions are optimized by PromQL to only evaluate once
 * rather than at each step of a range query. These are typically constant
 * expressions or scalar operations.
 *
 * This is an internal optimization node that may appear in parsed ASTs.
 *
 * @example
 * ```promql
 * time()           // current timestamp (step-invariant)
 * vector(1)        // constant vector
 * scalar(foo) + 1  // scalar operations
 * ```
 */
export interface PromQLStepInvariantExpr extends PromQLAstBaseItem {
  type: 'promql-step-invariant';

  /**
   * The inner expression that is step-invariant.
   */
  expr: PromQLExpression;
}

/**
 * Represents a parenthesized expression in PromQL.
 *
 * Parentheses are used to group expressions and control operator precedence.
 *
 * @example
 * ```promql
 * (foo + bar) * baz
 * rate((http_requests_total[5m]))
 * ```
 */
export interface PromQLParens extends PromQLAstBaseItem {
  type: 'parens';
  dialect: 'promql';

  /**
   * The child expression wrapped in parentheses.
   */
  child: PromQLExpression;
}
