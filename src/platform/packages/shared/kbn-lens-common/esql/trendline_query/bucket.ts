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
  BasicPrettyPrinter,
  isOptionNode,
  isFunctionExpression,
  isAssignment,
  isColumn,
} from '@elastic/esql';
import type { ESQLCommand, ESQLProperNode } from '@elastic/esql/types';
import { AUTO_TARGET_NUMBER_OF_BUCKETS } from '../constants';

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

export const buildTrendlineTbucketExpression = (): string =>
  `TBUCKET(${AUTO_TARGET_NUMBER_OF_BUCKETS})`;

/** A time-bucketing grouping found in a STATS BY clause. */
export interface TimeGrouping {
  kind: 'bucket' | 'tbucket';
  /** First argument of BUCKET(...); undefined for TBUCKET (implicit time field). */
  field?: string;
  /** Result column name: the alias when assigned, otherwise the printed expression. */
  resultColumn: string;
}

const TIME_GROUPING_FUNCTIONS = new Set(['bucket', 'tbucket']);

/**
 * Classifies a BY-clause expression as a time grouping, unwrapping a single
 * assignment alias. Returns undefined for non-time groupings.
 */
const classifyTimeGrouping = (expression: ESQLProperNode): TimeGrouping | undefined => {
  let alias: string | undefined;
  let candidate: ESQLProperNode | undefined = expression;

  if (isAssignment(expression) && isColumn(expression.args[0])) {
    alias = expression.args[0].name;
    const assignmentValue = Array.isArray(expression.args[1])
      ? expression.args[1][0]
      : expression.args[1];
    candidate = assignmentValue && !Array.isArray(assignmentValue) ? assignmentValue : undefined;
  }

  if (
    !candidate ||
    !isFunctionExpression(candidate) ||
    !TIME_GROUPING_FUNCTIONS.has(candidate.name)
  ) {
    return;
  }

  const kind = candidate.name as TimeGrouping['kind'];
  const firstArg = candidate.args[0];
  const field =
    kind === 'bucket' && firstArg && !Array.isArray(firstArg) && isColumn(firstArg)
      ? firstArg.name
      : undefined;

  return {
    kind,
    field,
    resultColumn: alias ?? BasicPrettyPrinter.expression(candidate),
  };
};

/**
 * Returns all time-bucketing groupings (BUCKET / TBUCKET) in the BY clause of
 * a STATS command. Single source of truth for time-grouping detection.
 */
export const getTimeGroupings = (statsCommand: ESQLCommand): TimeGrouping[] => {
  const byOption = statsCommand.args.find(isOptionNode);
  if (!byOption) return [];

  const groupings: TimeGrouping[] = [];
  for (const expression of byOption.args) {
    if (Array.isArray(expression)) continue;
    const grouping = classifyTimeGrouping(expression);
    if (grouping) groupings.push(grouping);
  }
  return groupings;
};

export const findFirstStatsAfterTs = (
  commands: ESQLCommand[]
): ESQLCommand<'stats'> | undefined => {
  const tsIndex = commands.findIndex((command) => command.name === 'ts');
  if (tsIndex === -1) return;
  return commands
    .slice(tsIndex + 1)
    .find((command): command is ESQLCommand<'stats'> => command.name === 'stats');
};

/** Finds the first STATS command whose BY clause contains a TBUCKET grouping. */
export const findStatsWithTbucket = (commands: ESQLCommand[]): ESQLCommand<'stats'> | undefined =>
  commands.find(
    (command): command is ESQLCommand<'stats'> =>
      command.name === 'stats' && getTbucketResultColumn(command) !== undefined
  );

/**
 * Returns the result column of a TBUCKET grouping: the alias when assigned,
 * otherwise the printed TBUCKET expression.
 */
export const getTbucketResultColumn = (statsCommand: ESQLCommand): string | undefined =>
  getTimeGroupings(statsCommand).find(({ kind }) => kind === 'tbucket')?.resultColumn;

/**
 * Returns the result column of a BUCKET grouping on the given time field:
 * the alias when assigned, otherwise the printed BUCKET expression.
 */
export const getBucketResultColumnForField = (
  statsCommand: ESQLCommand,
  timeField: string
): string | undefined =>
  getTimeGroupings(statsCommand).find(({ kind, field }) => kind === 'bucket' && field === timeField)
    ?.resultColumn;
