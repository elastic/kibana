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
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { DIMENSIONS_COLUMN } from './constants';

interface CreateESQLQueryParams {
  metric: MetricField;
  dimensions?: string[];
  filters?: Array<{ field: string; value: string }>;
}

const separator = '\u203A'.normalize('NFC');

function needsStringCasting(fieldType: string): boolean {
  const typesNeedingCast = new Set([
    'ip',
    'long',
    'integer',
    'short',
    'byte',
    'unsigned_long',
    'boolean',
  ]);
  return typesNeedingCast.has(fieldType);
}

export function createESQLQuery({ metric, dimensions = [], filters }: CreateESQLQueryParams) {
  const {
    name: metricField,
    index = 'metrics-*',
    instrument,
    dimensions: metricDimensions,
  } = metric;
  const source = timeseries(index);

  const whereConditions: QueryOperator[] = [];
  if (filters && filters.length) {
    const valuesByField = new Map<string, Set<string>>();

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
      ? where(dimensions.map((dim) => `${dim} IS NOT NULL`).join(' AND '))
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
