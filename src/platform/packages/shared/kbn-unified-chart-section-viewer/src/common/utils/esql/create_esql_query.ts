/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import { sanitazeESQLInput } from '@kbn/esql-utils';
import { createMetricAggregation, createTimeBucketAggregation } from './create_aggregation';
import { firstNonNullable } from '../first_null_nullable';
import type { ParsedMetricItem } from '../../../types';

/**
 * Formats a single-line ES|QL query into a multi-line format where each
 * pipe command is on its own line with `  | ` indentation.
 */
function formatQuery(basicQuery: string): string {
  return basicQuery.replace(/ \| /g, '\n  | ');
}

interface CreateESQLQueryParams {
  metricItem: ParsedMetricItem;
  splitAccessors?: string[];
  whereStatements?: string[];
}

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
  metricItem,
  splitAccessors = [],
  whereStatements = [],
}: CreateESQLQueryParams) {
  const { metricName, metricTypes, fieldTypes, dataStream } = metricItem;
  const index = dataStream;
  const instrument = firstNonNullable(metricTypes);

  if (fieldTypes.length === 0 || !instrument) {
    return '';
  }

  const metricAggregation = createMetricAggregation({
    types: fieldTypes,
    instrument,
    metricName,
    placeholderName: 'metricName',
  });

  if (!metricAggregation) {
    return '';
  }

  const query = esql.ts(index);
  const timeBucketAggregation = createTimeBucketAggregation({});
  const splitAccessorsClause =
    splitAccessors.length > 0
      ? `, ${splitAccessors.map((field) => sanitazeESQLInput(field)).join(',')}`
      : '';
  const statsClause = `STATS ${metricAggregation} BY ${timeBucketAggregation}${splitAccessorsClause}`;

  for (const statement of whereStatements) {
    const trimmed = statement.trim();
    if (trimmed.length > 0) {
      query.pipe(`WHERE ${trimmed}`);
    }
  }

  // TODO rename instrument to match metrics_info response
  query.pipe(statsClause);

  return formatQuery(query.print('basic'));
}
