/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryOperator } from '@kbn/esql-composer';
import { drop, evaluate, stats, timeseries, where, rename } from '@kbn/esql-composer';
import { type MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { DIMENSION_TYPES } from '../../constants';
import { DIMENSIONS_COLUMN } from './constants';

interface CreateESQLQueryParams {
  metric: MetricField;
  dimensions?: string[];
  filters?: Array<{ field: string; value: string }>;
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
 * @param filters - An array of filters to apply to the query.
 * @returns A complete ESQL query string.
 */
export function createESQLQuery({ metric, dimensions = [], filters }: CreateESQLQueryParams) {
  const { name: metricField, index, instrument, dimensions: metricDimensions } = metric;
  const source = timeseries(index);

  const whereConditions: QueryOperator[] = [];
  const valuesByField = new Map<string, Set<string>>();
  if (filters && filters.length) {
    for (const filter of filters) {
      const currentValues = valuesByField.get(filter.field);
      if (currentValues) {
        currentValues.add(filter.value);
      } else {
        valuesByField.set(filter.field, new Set([filter.value]));
      }
    }

    valuesByField.forEach((value, key) => {
      whereConditions.push(
        where(`${key} IN (${new Array(value.size).fill('?').join(', ')})`, Array.from(value))
      );
    });
  }

  const dimensionTypeMap = new Map(metricDimensions.map((dim) => [dim.name, dim.type]));

  const queryPipeline = source.pipe(
    ...whereConditions,
    dimensions.length > 0
      ? where(
          dimensions
            .filter((dim) => !valuesByField.has(dim))
            .map((dim) => `${dim} IS NOT NULL`)
            .join(' AND ')
        )
      : (query) => query,
    instrument === 'counter'
      ? stats(
          `SUM(RATE(??metricField)) BY BUCKET(@timestamp, 100, \?_tstart, \?_tend)${
            dimensions.length > 0 ? `, ${dimensions.join(',')}` : ''
          }`,
          {
            metricField,
          }
        )
      : stats(
          `AVG(??metricField) BY BUCKET(@timestamp, 100, \?_tstart, \?_tend) ${
            dimensions.length > 0 ? `, ${dimensions.join(',')}` : ''
          }`,
          {
            metricField,
          }
        ),
    ...(dimensions.length > 0
      ? dimensions.length === 1
        ? [rename(`??dim as ${DIMENSIONS_COLUMN}`, { dim: dimensions[0] })]
        : [
            evaluate(
              `${DIMENSIONS_COLUMN} = CONCAT(${dimensions
                .map((dim) => {
                  const dimType = dimensionTypeMap.get(dim);
                  return dimType && needsStringCasting(dimType) ? `${dim}::STRING` : dim;
                })
                .join(`, " ${separator} ", `)})`
            ),
            drop(`${dimensions.join(',')}`),
          ]
      : [])
  );

  return queryPipeline.toString();
}
