/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql, parse, BasicPrettyPrinter, isOptionNode } from '@elastic/esql';
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
  const { root } = parse(`FROM _x | STATS _x BY ${bucketExpr}`);
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
 * - Query has no `STATS` → appends a `STATS COUNT(*) BY BUCKET(...)` command
 */
export const appendTimeBucketToEsqlQuery = (esqlQuery: string, timeField: string): string => {
  const bucketExpr = buildTrendlineBucketExpression(timeField);
  const bucketNode = parseBucketNode(bucketExpr);

  const { root } = parse(esqlQuery);

  if (root.commands.length === 0) {
    throw new Error('Cannot append time bucket to an empty ES|QL query');
  }

  const statsCmd = root.commands.findLast((c): c is ESQLCommand<'stats'> => c.name === 'stats');

  if (statsCmd) {
    const byOption = statsCmd.args.find(isOptionNode);

    if (byOption) {
      // STATS ... BY ... → append to existing BY
      byOption.args.push(bucketNode);
    } else {
      // STATS without BY → extract a typed BY option node from a helper parse
      const { root: byHelper } = parse(`FROM _x | STATS _x BY ${bucketExpr}`);
      const byNode = findByOption(findStatsCommand(byHelper.commands));
      statsCmd.args.push(byNode);
    }
  } else {
    // No STATS → append full STATS COUNT(*) BY BUCKET(...) command
    const { root: helperAst } = parse(`FROM _x | STATS COUNT(*) BY ${bucketExpr}`);
    root.commands.push(findStatsCommand(helperAst.commands));
  }

  return BasicPrettyPrinter.print(root);
};
