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
import type { ESQLCommand } from '@elastic/esql/types';
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
export const getTbucketResultColumn = (statsCommand: ESQLCommand): string | undefined => {
  const byOption = statsCommand.args.find(isOptionNode);
  if (!byOption) return;

  for (const expression of byOption.args) {
    if (isFunctionExpression(expression) && expression.name === 'tbucket') {
      return BasicPrettyPrinter.expression(expression);
    }
    if (isAssignment(expression) && isColumn(expression.args[0])) {
      const assignmentValue = Array.isArray(expression.args[1])
        ? expression.args[1][0]
        : expression.args[1];
      if (
        assignmentValue &&
        isFunctionExpression(assignmentValue) &&
        assignmentValue.name === 'tbucket'
      ) {
        return expression.args[0].name;
      }
    }
  }
};

/**
 * Returns the result column of a BUCKET grouping on the given time field:
 * the alias when assigned, otherwise the printed BUCKET expression.
 */
export const getBucketResultColumnForField = (
  statsCommand: ESQLCommand,
  timeField: string
): string | undefined => {
  const byOption = statsCommand.args.find(isOptionNode);
  if (!byOption) return;

  const isBucketOnField = (node: unknown): boolean => {
    if (!node || Array.isArray(node)) return false;
    const expression = node as Parameters<typeof isFunctionExpression>[0];
    if (!isFunctionExpression(expression) || expression.name !== 'bucket') return false;
    const firstArg = expression.args[0];
    return !Array.isArray(firstArg) && isColumn(firstArg) && firstArg.name === timeField;
  };

  for (const expression of byOption.args) {
    if (isBucketOnField(expression) && isFunctionExpression(expression)) {
      return BasicPrettyPrinter.expression(expression);
    }
    if (isAssignment(expression) && isColumn(expression.args[0])) {
      const assignmentValue = Array.isArray(expression.args[1])
        ? expression.args[1][0]
        : expression.args[1];
      if (isBucketOnField(assignmentValue)) {
        return expression.args[0].name;
      }
    }
  }
};
