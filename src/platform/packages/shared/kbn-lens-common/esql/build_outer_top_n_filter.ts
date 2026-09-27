/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface OuterTopNFilterInput {
  /** Source of the main query, already escaped for `FROM`. */
  source: string;
  /** Time range clause of the main query, omitted for data views without a time field. */
  timeFilter?: string;
  /** ES|QL expression of the outer grouping column. */
  groupExpr: string;
  /**
   * `STATS` fragment ranking the outer values, evaluated per outer group rather than
   * per leaf row, e.g. `AVG(bytes)` or `avg_bytes = AVG(bytes)`.
   */
  scoreFragment: string;
  /** `SORT` clause selecting the top values, e.g. '`AVG(bytes)` DESC'. */
  sortClause: string;
  /** Number of outer values to keep, from the dimension's `size`. */
  size: number;
}

/**
 * Builds the `WHERE <group> IN (…)` clause that restricts a query to the top values of an
 * outer dimension. `LIMIT n BY` only limits rows per group, so without this the chart would
 * show every outer value instead of the configured number, unlike the equivalent DSL chart.
 */
export const buildOuterTopNFilter = ({
  source,
  timeFilter,
  groupExpr,
  scoreFragment,
  sortClause,
  size,
}: OuterTopNFilterInput): string => {
  const subqueryParts = [`FROM ${source}`];

  if (timeFilter) {
    subqueryParts.push(timeFilter);
  }

  subqueryParts.push(
    `STATS ${scoreFragment} BY ${groupExpr}`,
    `SORT ${sortClause}`,
    `LIMIT ${size}`,
    // The subquery must return exactly one column to be compared against.
    `KEEP ${groupExpr}`
  );

  return `WHERE ${groupExpr} IN (${subqueryParts.join(' | ')})`;
};
