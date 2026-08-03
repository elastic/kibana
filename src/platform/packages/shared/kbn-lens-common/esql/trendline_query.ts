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
  isParens,
  isColumn,
} from '@elastic/esql';
import type {
  ESQLAstItem,
  ESQLAstQueryExpression,
  ESQLCommand,
  ESQLCommandOption,
  ESQLFunction,
} from '@elastic/esql/types';
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
 * Returns true when the ES|QL query contains at least one STATS command,
 * including STATS nested inside FORK branches.
 */
export const queryHasStatsCommand = (esqlQuery: string): boolean => {
  const { root } = Parser.parse(esqlQuery);
  if (root.commands.some((c) => c.name === 'stats')) {
    return true;
  }
  return getForkBranchCommandLists(root).some((branchCommands) =>
    branchCommands.some((c) => c.name === 'stats')
  );
};

const asSingleNode = (arg: ESQLAstItem): ESQLAstItem | undefined =>
  Array.isArray(arg) ? arg[0] : arg;

/**
 * Resolves a BY argument to a BUCKET() function node, supporting both
 * `BUCKET(field, ...)` and aliased `name = BUCKET(field, ...)` forms.
 */
const getBucketFunction = (arg: ESQLAstItem): ESQLFunction | undefined => {
  if (!isFunctionExpression(arg)) {
    return undefined;
  }
  if (arg.name === 'bucket') {
    return arg;
  }
  if (arg.name === '=') {
    const rhs = asSingleNode(arg.args[1]);
    if (rhs && isFunctionExpression(rhs) && rhs.name === 'bucket') {
      return rhs;
    }
  }
  return undefined;
};

/**
 * Checks whether a BY option already contains a BUCKET() call on the given time field.
 */
const hasBucketForField = (byOption: ESQLCommandOption, timeField: string): boolean =>
  byOption.args.some((arg) => {
    const bucketFn = getBucketFunction(arg);
    if (!bucketFn || bucketFn.args.length === 0) {
      return false;
    }
    const firstArg = asSingleNode(bucketFn.args[0]);
    return Boolean(firstArg && firstArg.type === 'column' && firstArg.name === timeField);
  });

/**
 * Collects command lists for each FORK branch in the query AST.
 */
const getForkBranchCommandLists = (root: ESQLAstQueryExpression): ESQLCommand[][] => {
  const forkCmd = root.commands.find((c): c is ESQLCommand<'fork'> => c.name === 'fork');
  if (!forkCmd) return [];

  return forkCmd.args.flatMap((arg) => {
    if (!isParens(arg) || arg.child.type !== 'query') {
      return [];
    }
    return [arg.child.commands];
  });
};

/**
 * Returns STATS output column names (aliases and bare aggregation expressions).
 */
const getStatsOutputColumnNames = (statsCmd: ESQLCommand): string[] => {
  const names: string[] = [];
  for (const arg of statsCmd.args) {
    if (isOptionNode(arg)) continue;
    if (!isFunctionExpression(arg)) continue;
    if (arg.name === '=' && isColumn(arg.args[0])) {
      names.push(arg.args[0].name);
      continue;
    }
    // Bare aggregation: column name is the printed expression (e.g. COUNT(*)).
    names.push(BasicPrettyPrinter.expression(arg));
  }
  return names;
};

const branchHasStatsBucketForField = (
  branchCommands: ESQLCommand[],
  timeField: string
): boolean => {
  const statsCmd = branchCommands.findLast((c): c is ESQLCommand<'stats'> => c.name === 'stats');
  if (!statsCmd) return false;
  const byOption = statsCmd.args.find(isOptionNode);
  return Boolean(byOption && hasBucketForField(byOption, timeField));
};

/**
 * When the source query uses FORK with nested STATS, trendline generation cannot
 * append `BY BUCKET(timestamp, ...)` after FORK — source fields like `timestamp`
 * are no longer in scope. Instead, expand a single STATS branch into a top-level
 * query (preserving pre-FORK commands) so time bucketing can be applied where
 * the time field still exists.
 *
 * Prefers a STATS branch that produces one of the metric fields and does not
 * already bucket by time, so Lens can add an unaliased BUCKET(...) whose result
 * column name matches `buildTrendlineBucketExpression`.
 */
const expandForkStatsBranchForTrendline = (
  root: ESQLAstQueryExpression,
  timeField: string,
  metricFields: string[] = []
): ESQLAstQueryExpression | undefined => {
  // If a top-level STATS already exists, the regular path can modify it.
  if (root.commands.some((c) => c.name === 'stats')) {
    return undefined;
  }

  const forkIndex = root.commands.findIndex((c) => c.name === 'fork');
  if (forkIndex === -1) {
    return undefined;
  }

  const branches = getForkBranchCommandLists(root).filter((branchCommands) =>
    branchCommands.some((c) => c.name === 'stats')
  );
  if (branches.length === 0) {
    return undefined;
  }

  const matchingMetricBranches =
    metricFields.length > 0
      ? branches.filter((branchCommands) => {
          const statsCmd = branchCommands.findLast(
            (c): c is ESQLCommand<'stats'> => c.name === 'stats'
          );
          if (!statsCmd) return false;
          const outputNames = getStatsOutputColumnNames(statsCmd);
          return metricFields.some((field) => outputNames.includes(field));
        })
      : [];

  const candidates = matchingMetricBranches.length > 0 ? matchingMetricBranches : branches;

  // Prefer a branch without an existing time bucket so we can append an
  // unaliased BUCKET(...) that matches Lens trendline column fieldNames.
  const selectedBranch =
    candidates.find((branchCommands) => !branchHasStatsBucketForField(branchCommands, timeField)) ??
    candidates[0];

  return {
    ...root,
    commands: [...root.commands.slice(0, forkIndex), ...selectedBranch],
  };
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
 * Handles four cases:
 * - Query has `FORK` with nested `STATS` → expands a matching STATS branch, then
 *   applies the rules below (so `timestamp` remains in scope)
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

  const { root: parsedRoot } = Parser.parse(esqlQuery);
  const root =
    expandForkStatsBranchForTrendline(parsedRoot, timeField, metricFields) ?? parsedRoot;

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
      // Always pass metric fields so FORK branch selection can match the KPI
      // column. AVG wrapping only happens when the (expanded) query has no STATS.
      metricFields,
      !sourceQueryHasStats ? groupByFields : undefined
    ),
    metricFieldMap,
  };
};
