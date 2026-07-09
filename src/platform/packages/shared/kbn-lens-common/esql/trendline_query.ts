/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  esql,
  Parser,
  BasicPrettyPrinter,
  isOptionNode,
  isFunctionExpression,
} from '@elastic/esql';
import type { ESQLCommand, ESQLCommandOption } from '@elastic/esql/types';
import { AUTO_TARGET_NUMBER_OF_BUCKETS } from './constants';

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
 * Parses a BUCKET expression into an AST node by extracting it from a helper query.
 */
const parseBucketNode = (bucketExpr: string) => {
  const { root } = Parser.parse(`FROM _x | STATS _x BY ${bucketExpr}`);
  const statsCmd = findStatsCommand(root.commands);
  const byOption = findByOption(statsCmd);
  return byOption.args[0];
};

/** Finds the STATS command in a list of AST commands. */
const findStatsCommand = (commands: ESQLCommand[]): ESQLCommand => {
  const cmd = commands.find((c): c is ESQLCommand<'stats'> => c.name === 'stats');
  if (!cmd) throw new Error('Expected STATS command in parsed AST');
  return cmd;
};

/** Finds the BY option within a STATS command's args. */
const findByOption = (statsCmd: ESQLCommand): ESQLCommandOption => {
  const option = statsCmd.args.find(isOptionNode);
  if (!option) throw new Error('Expected BY option in STATS command');
  return option;
};

/**
 * Returns true when the ES|QL query contains at least one STATS command.
 */
export const queryHasStatsCommand = (esqlQuery: string): boolean => {
  const { root } = Parser.parse(esqlQuery);
  return root.commands.some((c) => c.name === 'stats');
};

/**
 * Checks whether a BY option already contains a BUCKET() call on the given time field.
 */
const hasBucketForField = (byOption: ESQLCommandOption, timeField: string): boolean =>
  byOption.args.some((arg) => {
    if (!isFunctionExpression(arg) || arg.name !== 'bucket' || arg.args.length === 0) {
      return false;
    }
    const firstArg = arg.args[0];
    return !Array.isArray(firstArg) && firstArg.type === 'column' && firstArg.name === timeField;
  });

/**
 * Appends a BUCKET time-bucketing clause to an ES|QL query for trendline use.
 *
 * Uses `@elastic/esql` AST parsing and manipulation for correct handling of
 * complex queries with proper field name escaping (e.g. dotted field names
 * are backtick-quoted).
 *
 * The query is parsed into an AST, the BUCKET expression is appended to the
 * appropriate STATS/BY clause, and the result is printed back to a string.
 *
 * Handles three cases:
 * - Query has `STATS ... BY ...` → appends BUCKET to the existing BY clause
 * - Query has `STATS` without `BY` → adds a BY clause with BUCKET
 * - Query has no `STATS` → appends a `STATS <agg> BY BUCKET(...)` command
 *
 * When the query has no STATS and `metricFields` are provided, each field is
 * wrapped in `AVG()` (e.g. `STATS AVG(bytes) BY BUCKET(...)`). When no metric
 * fields are given, it falls back to `STATS COUNT(*) BY BUCKET(...)`.
 */
export const appendTimeBucketToEsqlQuery = (
  esqlQuery: string,
  timeField: string,
  metricFields?: string[],
  groupByFields: string[] = []
): string => {
  const bucketExpr = buildTrendlineBucketExpression(timeField);
  const bucketNode = parseBucketNode(bucketExpr);

  const { root } = Parser.parse(esqlQuery);

  if (root.commands.length === 0) {
    throw new Error('Cannot append time bucket to an empty ES|QL query');
  }

  const statsCmd = root.commands.findLast((c): c is ESQLCommand<'stats'> => c.name === 'stats');

  if (statsCmd) {
    const byOption = statsCmd.args.find(isOptionNode);

    if (byOption && !hasBucketForField(byOption, timeField)) {
      // STATS ... BY ... → append to existing BY
      byOption.args.push(bucketNode);
    } else if (!byOption) {
      // STATS without BY → extract a typed BY option node from a helper parse
      const { root: byHelper } = Parser.parse(`FROM _x | STATS _x BY ${bucketExpr}`);
      const byNode = findByOption(findStatsCommand(byHelper.commands));
      statsCmd.args.push(byNode);
    }
  } else {
    // No STATS → append full STATS <agg> BY BUCKET(...) command.
    // Use AVG(<field>) for each provided metric field, or COUNT(*) as fallback.
    const statsExprs =
      metricFields && metricFields.length > 0
        ? metricFields.map((f) => `AVG(${esql.col(f)})`).join(', ')
        : 'COUNT(*)';
    const effectiveGroupByFields = groupByFields.filter((field) => field !== timeField);
    const groupByExprs = [...effectiveGroupByFields.map((f) => esql.col(f)), bucketExpr].join(', ');
    const { root: helperAst } = Parser.parse(`FROM _x | STATS ${statsExprs} BY ${groupByExprs}`);
    root.commands.push(findStatsCommand(helperAst.commands));
  }

  return BasicPrettyPrinter.print(root);
};

export interface TrendlineQueryWithMetricFieldMap {
  query: string;
  metricFieldMap: Map<string, string>;
}

/**
 * Builds a trendline ES|QL query and returns the generated metric result column names.
 *
 * When the source query has no STATS command, the trendline query adds AVG(<field>)
 * aggregations for the provided metric fields. The returned map keeps Lens column
 * fieldNames aligned with those generated ES|QL result columns.
 */
export const buildTrendlineQueryWithMetricFieldMap = (
  esqlQuery: string,
  timeField: string,
  metricFields: string[] = [],
  groupByFields: string[] = []
): TrendlineQueryWithMetricFieldMap => {
  const sourceQueryHasStats = queryHasStatsCommand(esqlQuery);
  const metricFieldMap = new Map<string, string>();

  if (!sourceQueryHasStats) {
    metricFields.forEach((field) => metricFieldMap.set(field, `AVG(${esql.col(field)})`));
  }

  return {
    query: appendTimeBucketToEsqlQuery(
      esqlQuery,
      timeField,
      !sourceQueryHasStats ? metricFields : undefined,
      !sourceQueryHasStats ? groupByFields : undefined
    ),
    metricFieldMap,
  };
};
