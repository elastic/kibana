/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  MetricField,
  Dimension,
  DimensionFilters,
} from '@kbn/metrics-experience-plugin/common/types';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { sanitazeESQLInput } from '@kbn/esql-utils';
import { esql, Walker, Parser, BasicPrettyPrinter } from '@kbn/esql-ast';
import type { ESQLCommand, ComposerQuery } from '@kbn/esql-ast';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { DIMENSIONS_COLUMN } from './constants';
import { createMetricAggregation, createTimeBucketAggregation } from './create_aggregation';

interface CreateESQLQueryParams {
  metric: MetricField;
  dimensions?: Dimension[];
  filters?: DimensionFilters;
  fetchParams?: Pick<ChartSectionProps, 'fetchParams'>['fetchParams'];
}

/**
 * Extracts the WHERE command string from an ES|QL query.
 * Reusable helper that parses the query and returns the WHERE clause if present.
 *
 * @param esqlQuery - The ES|QL query string to parse
 * @returns The printed WHERE command string if found, undefined otherwise
 */
export function extractWhereCommand(esqlQuery: string | undefined): string | undefined {
  if (!esqlQuery || esqlQuery.trim().length === 0) {
    return undefined;
  }

  try {
    const ast = Parser.parse(esqlQuery);
    const whereNode = Walker.find(
      ast.root,
      (node): node is ESQLCommand => node.type === 'command' && node.name === 'where'
    );
    return whereNode ? BasicPrettyPrinter.print(whereNode) : undefined;
  } catch {
    return undefined;
  }
}

const separator = '\u203A'.normalize('NFC');

/**
 * Checks if a given field type requires explicit casting to a string in an ESQL query.
 * This is necessary for non-keyword types like IP, numeric, and boolean fields when
 * used in CONCAT operations.
 *
 * @param fieldType - The Elasticsearch field type (e.g., 'ip', 'long', 'keyword').
 * @returns `true` if the field type needs to be cast to a string, otherwise `false`.
 */
function needsStringCasting(fieldType: ES_FIELD_TYPES): boolean {
  return fieldType !== ES_FIELD_TYPES.KEYWORD && fieldType !== ES_FIELD_TYPES.TEXT;
}

/**
 * Casts a field name to a string type if needed based on its field type.
 * This helper ensures consistent type casting for non-keyword fields in CONCAT operations.
 *
 * @param fieldName - The field name (should already be sanitized).
 * @param fieldType - Optional field type to determine if string casting is needed.
 * @returns The field name with optional string casting applied.
 */
function castFieldIfNeeded(fieldName: string, fieldType: string | undefined): string {
  if (fieldType && needsStringCasting(fieldType as ES_FIELD_TYPES)) {
    return `${fieldName}::STRING`;
  }
  return fieldName;
}

/**
 * Applies dimension filters and optional user WHERE clause to a query.
 * Reusable helper shared with buildEsqlQuery in enrich_metric_fields.ts.
 *
 * @param baseQuery - The base query to apply filters to
 * @param dimensionFilters - A map of field names to arrays of values to filter by
 * @param userQuery - Optional ES|QL query string to extract WHERE clause from
 * @returns The query with all filter WHERE clauses applied
 */
export function applyDimensionFilters(
  baseQuery: ComposerQuery,
  dimensionFilters: DimensionFilters,
  userQuery?: string
) {
  // Use accumulator to carry both query and param index (avoids mutable let)
  const { query: queryWithFilters } = Object.entries(dimensionFilters).reduce(
    (acc, [dimensionName, values]) => {
      if (values.length === 0) {
        return acc;
      }

      const paramNames = values.map((_, i) => `?value${acc.paramIdx + i}`).join(', ');
      const whereClause = `WHERE \`${dimensionName}\`::STRING IN (${paramNames})`;

      const newQuery = values.reduce(
        (q, value, i) => q.setParam(`value${acc.paramIdx + i}`, value),
        acc.query.pipe(whereClause)
      );

      return { query: newQuery, paramIdx: acc.paramIdx + values.length };
    },
    { query: baseQuery, paramIdx: 0 }
  );

  const whereCommand = userQuery ? extractWhereCommand(userQuery) : undefined;
  return whereCommand ? queryWithFilters.pipe(whereCommand) : queryWithFilters;
}

/**
 * Creates a complete ESQL query string for metrics visualizations.
 * The function constructs a query that includes time series aggregation, filtering,
 * and selective string casting for dimension fields to prevent query failures with
 * non-keyword types.
 *
 * @param metric - The full metric field object, including dimension type information.
 * @param dimensions - An array of selected dimension names.
 * @param filters - A map of field names to arrays of values to filter by.
 * @param fetchParams - The request parameters from the chart section used to extract the WHERE clause.
 * @returns A complete ESQL query string.
 */
export function createESQLQuery({
  metric,
  dimensions = [],
  filters = {},
  fetchParams,
}: CreateESQLQueryParams) {
  const { name: metricField, instrument, index } = metric;

  const baseQuery = esql.ts(index);
  const userQuery = isOfAggregateQueryType(fetchParams?.query) ? fetchParams.query.esql : undefined;
  const queryWithFilters = applyDimensionFilters(baseQuery, filters, userQuery);
  const unfilteredDimensions = dimensions.filter((dim) => !(dim.name in filters));

  const queryWithNullCheck =
    unfilteredDimensions.length > 0
      ? queryWithFilters.pipe(
          `WHERE ${unfilteredDimensions
            .map((dim) => `${sanitazeESQLInput(dim.name)} IS NOT NULL`)
            .join(' AND ')}`
        )
      : queryWithFilters;

  // Build STATS aggregation
  const dimensionFields =
    dimensions.length > 0
      ? `, ${dimensions.map((dim) => sanitazeESQLInput(dim.name)).join(',')}`
      : '';

  const statsClause = `STATS ${createMetricAggregation({
    instrument,
    placeholderName: 'metricField',
  })} BY ${createTimeBucketAggregation({})}${dimensionFields}`;

  const queryWithStats = queryWithNullCheck.pipe(statsClause).setParam('metricField', metricField);

  // Build EVAL and DROP for multiple dimensions (concat into single column)
  const finalQuery =
    dimensions.length > 1
      ? (() => {
          const concatParts = dimensions
            .map((dim) => {
              const sanitized = sanitazeESQLInput(dim.name) ?? dim.name;
              return castFieldIfNeeded(sanitized, dim.type);
            })
            .join(`, " ${separator} ", `);

          const dropFields = dimensions.map((dim) => sanitazeESQLInput(dim.name)).join(',');

          return queryWithStats
            .pipe(`EVAL ${DIMENSIONS_COLUMN} = CONCAT(${concatParts})`)
            .pipe(`DROP ${dropFields}`);
        })()
      : queryWithStats;

  return finalQuery.inlineParams().print('wrapping');
}
