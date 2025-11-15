/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryOperator } from '@kbn/esql-composer';
import { drop, evaluate, stats, timeseries, where } from '@kbn/esql-composer';
import type { MetricField, DimensionFilters } from '@kbn/metrics-experience-plugin/common/types';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { sanitazeESQLInput } from '@kbn/esql-utils';
import { DIMENSION_TYPES } from '../../constants';
import { DIMENSIONS_COLUMN } from './constants';
import { createMetricAggregation, createTimeBucketAggregation } from './create_aggregation';

interface CreateESQLQueryParams {
  metric: MetricField;
  dimensions?: string[];
  filters?: DimensionFilters;
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
  return DIMENSION_TYPES.includes(fieldType) && fieldType !== ES_FIELD_TYPES.KEYWORD;
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
 * @returns A complete ESQL query string.
 */
export function createESQLQuery({ metric, dimensions = [], filters = {} }: CreateESQLQueryParams) {
  const { name: metricField, instrument, index, dimensions: metricDimensions } = metric;
  const source = timeseries(index);

  const whereConditions: QueryOperator[] = [];
  const dimensionTypeMap = new Map(metricDimensions?.map((dim) => [dim.name, dim.type]));

  Object.entries(filters).forEach(([key, values]) => {
    const escapedKey = sanitazeESQLInput(key);

    // Always cast to STRING for filtering to handle potential mapping conflicts
    // where the same field name exists with different types (e.g., both long and keyword)
    const castedKey = `${escapedKey}::STRING`;

    whereConditions.push(
      where(`${castedKey} IN (${new Array(values.length).fill('?').join(', ')})`, values)
    );
  });

  const unfilteredDimensions = (dimensions ?? []).filter((dim) => !(dim in filters));
  const queryPipeline = source.pipe(
    ...whereConditions,
    unfilteredDimensions.length > 0
      ? where(
          unfilteredDimensions
            .map((dim) => {
              const dimType = dimensionTypeMap.get(dim);
              const escapedDim = sanitazeESQLInput(dim);
              const castedDim =
                dimType && needsStringCasting(dimType) ? `${escapedDim}::STRING` : escapedDim;
              return `${castedDim} IS NOT NULL`;
            })
            .join(' AND ')
        )
      : (query) => query,
    stats(
      `${createMetricAggregation({
        instrument,
        placeholderName: 'metricField',
      })} BY ${createTimeBucketAggregation({})}${
        (dimensions ?? []).length > 0
          ? `, ${dimensions.map((dim) => sanitazeESQLInput(dim)).join(',')}`
          : ''
      }`,
      {
        metricField,
      }
    ),
    ...((dimensions ?? []).length > 0
      ? dimensions.length === 1
        ? []
        : [
            evaluate(
              `${DIMENSIONS_COLUMN} = CONCAT(${dimensions
                .map((dim) => {
                  const dimType = dimensionTypeMap.get(dim);
                  const escapedDim = sanitazeESQLInput(dim);
                  return dimType && needsStringCasting(dimType)
                    ? `${escapedDim}::STRING`
                    : escapedDim;
                })
                .join(`, " ${separator} ", `)})`
            ),
            drop(`${dimensions.map((dim) => sanitazeESQLInput(dim)).join(',')}`),
          ]
      : [])
  );

  return queryPipeline.toString();
}
