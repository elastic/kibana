/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AUTO_TARGET_NUMBER_OF_BUCKETS } from './constants';

/**
 * Builds the BUCKET expression used for trendline time bucketing.
 *
 * Uses `AUTO_TARGET_NUMBER_OF_BUCKETS` (75) to match the bucket width that
 * Lens's form-based `auto` date_histogram produces when converting to ES|QL.
 *
 * ES|QL uses the expression as written in the query as the result column name,
 * preserving `?_tstart` and `?_tend` literally (they are not substituted into
 * the column name). This means the column name is already stable across time
 * range changes without needing an alias.
 */
export const buildTrendlineBucketExpression = (timeField: string): string =>
  `BUCKET(${timeField}, ${AUTO_TARGET_NUMBER_OF_BUCKETS}, ?_tstart, ?_tend)`;

/**
 * Appends a BUCKET time-bucketing clause to an ES|QL query for trendline use.
 *
 * Handles three cases:
 * - Query has `STATS ... BY ...` → appends `, <bucket>` to the BY clause
 * - Query has `STATS` without `BY` → appends ` BY <bucket>`
 * - Query has no `STATS` → appends `| STATS COUNT(*) BY <bucket>`
 */
export const appendTimeBucketToEsqlQuery = (esqlQuery: string, timeField: string): string => {
  const bucketExpr = buildTrendlineBucketExpression(timeField);

  if (/\bSTATS\b/i.test(esqlQuery)) {
    return /\bBY\b/i.test(esqlQuery)
      ? `${esqlQuery}, ${bucketExpr}`
      : `${esqlQuery} BY ${bucketExpr}`;
  }

  return `${esqlQuery} | STATS COUNT(*) BY ${bucketExpr}`;
};
