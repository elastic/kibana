/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql, parse, BasicPrettyPrinter } from '@elastic/esql';
import { AUTO_TARGET_NUMBER_OF_BUCKETS } from './constants';

/**
 * Minimal shape of an ES|QL AST option node (e.g. the `BY` clause of `STATS`).
 * The full types from `@elastic/esql` are not re-exported from the package
 * entry point, so we define the subset we need for AST manipulation.
 */
interface AstOptionNode {
  type: 'option';
  name: string;
  args: unknown[];
}

/** Type guard for an AST option node with a specific name. */
const isOptionNode = (item: unknown, name: string): item is AstOptionNode =>
  typeof item === 'object' &&
  item !== null &&
  !Array.isArray(item) &&
  (item as Record<string, unknown>).type === 'option' &&
  (item as Record<string, unknown>).name === name;

/**
 * Builds the BUCKET expression used for trendline time bucketing.
 *
 * Uses `AUTO_TARGET_NUMBER_OF_BUCKETS` (75) to match the bucket width that
 * Lens's form-based `auto` date_histogram produces when converting to ES|QL.
 *
 * Uses `esql.col()` to properly escape field names that contain special
 * characters (e.g. `order.date` → `` `order.date` ``).
 *
 * ES|QL uses the expression as written in the query as the result column name,
 * preserving `?_tstart` and `?_tend` literally (they are not substituted into
 * the column name). This means the column name is already stable across time
 * range changes without needing an alias.
 */
export const buildTrendlineBucketExpression = (timeField: string): string =>
  `BUCKET(${esql.col(timeField)}, ${AUTO_TARGET_NUMBER_OF_BUCKETS}, ?_tstart, ?_tend)`;

/**
 * Extracts the BUCKET function AST node from a helper query.
 */
const parseBucketNode = (bucketExpr: string): unknown => {
  const { root } = parse(`FROM _x | STATS _x BY ${bucketExpr}`);
  const stats = root.commands.find((c: { name: string }) => c.name === 'stats') as unknown as {
    args: unknown[];
  };
  const by = stats.args.find((a) => isOptionNode(a, 'by')) as AstOptionNode;
  return by.args[0];
};

/**
 * Appends a BUCKET time-bucketing clause to an ES|QL query for trendline use.
 *
 * Uses `@elastic/esql` AST parsing and manipulation instead of brittle string
 * regex, ensuring correct handling of complex queries. The query is parsed into
 * an AST, the BUCKET expression is appended to the appropriate STATS/BY clause,
 * and the result is printed back to a string.
 *
 * Handles three cases:
 * - Query has `STATS ... BY ...` → appends BUCKET to the existing BY clause
 * - Query has `STATS` without `BY` → adds a BY clause with BUCKET
 * - Query has no `STATS` → appends a `STATS COUNT(*) BY BUCKET(...)` command
 */
export const appendTimeBucketToEsqlQuery = (esqlQuery: string, timeField: string): string => {
  const bucketExpr = buildTrendlineBucketExpression(timeField);
  const bucketNode = parseBucketNode(bucketExpr);

  const { root } = parse(esqlQuery);
  const statsCmd = root.commands.find((c: { name: string }) => c.name === 'stats') as unknown as
    | { args: unknown[] }
    | undefined;

  if (statsCmd) {
    const byOption = statsCmd.args.find((a) => isOptionNode(a, 'by')) as AstOptionNode | undefined;

    if (byOption) {
      byOption.args.push(bucketNode);
    } else {
      // Parse a helper to get a properly typed BY option node
      const { root: byHelper } = parse(`FROM _x | STATS _x BY ${bucketExpr}`);
      const byStats = byHelper.commands.find(
        (c: { name: string }) => c.name === 'stats'
      ) as unknown as { args: unknown[] };
      const newBy = byStats.args.find((a) => isOptionNode(a, 'by'));
      statsCmd.args.push(newBy!);
    }
  } else {
    const { root: helperAst } = parse(`FROM _x | STATS COUNT(*) BY ${bucketExpr}`);
    const newStatsCmd = helperAst.commands.find((c: { name: string }) => c.name === 'stats');
    root.commands.push(newStatsCmd!);
  }

  return BasicPrettyPrinter.print(root);
};
