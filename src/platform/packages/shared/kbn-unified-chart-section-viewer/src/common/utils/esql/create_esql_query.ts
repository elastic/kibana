/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { drop, evaluate, stats, timeseries, where } from '@kbn/esql-composer';
import { sanitazeESQLInput } from '@kbn/esql-utils';
import type { MetricField } from '../../../types';
import { DIMENSIONS_COLUMN } from './constants';
import { createMetricAggregation, createTimeBucketAggregation } from './create_aggregation';

interface CreateESQLQueryParams {
  metric: MetricField;
  splitAccessors?: string[];
  whereStatements?: string[];
}

const separator = '\u203A'.normalize('NFC');

/**
 * Creates a complete ESQL query string for metrics visualizations.
 * The function constructs a query that includes time series aggregation
 * and split accessors for dimension breakdowns.
 *
 * @param metric - The full metric field object, including dimension type information.
 * @param splitAccessors - An array of field names to use as split accessors in the BY clause.
 * @param whereStatements - Optional WHERE clause statements.
 * @returns A complete ESQL query string.
 */
export function createESQLQuery({
  metric,
  splitAccessors = [],
  whereStatements = [],
}: CreateESQLQueryParams) {
  const { name: metricField, instrument, index } = metric;
  const source = timeseries(index);

  const whereCommands = whereStatements.flatMap((statement) => {
    const trimmed = statement.trim();
    return trimmed.length > 0 ? [where(trimmed)] : [];
  });

  const queryPipeline = source.pipe(
    ...whereCommands,
    stats(
      `${createMetricAggregation({
        instrument,
        placeholderName: 'metricField',
      })} BY ${createTimeBucketAggregation({})}${
        splitAccessors.length > 0
          ? `, ${splitAccessors.map((field) => sanitazeESQLInput(field)).join(',')}`
          : ''
      }`,
      {
        metricField,
      }
    ),
    ...(splitAccessors.length > 1
      ? [
          evaluate(
            `${DIMENSIONS_COLUMN} = CONCAT(${splitAccessors
              .map((field) => sanitazeESQLInput(field))
              .join(`, " ${separator} ", `)})`
          ),
          drop(`${splitAccessors.map((field) => sanitazeESQLInput(field)).join(',')}`),
        ]
      : [])
  );

  return queryPipeline.toString();
}
