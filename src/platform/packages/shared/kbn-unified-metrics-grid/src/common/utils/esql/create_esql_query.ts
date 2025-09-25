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
import { DIMENSIONS_COLUMN } from './constants';

interface CreateESQLQueryParams {
  metricField: string;
  index?: string;
  instrument?: string;
  dimensions?: string[];
  filters?: Array<{ field: string; value: string }>;
}

const separator = '\u203A'.normalize('NFC');

export function createESQLQuery({
  index = 'metrics-*',
  instrument,
  dimensions = [],
  metricField,
  filters,
}: CreateESQLQueryParams) {
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
            evaluate(`${DIMENSIONS_COLUMN} = CONCAT(${dimensions.join(`, " ${separator} ", `)})`),
            drop(`${dimensions.join(',')}`),
          ]
      : [])
  );

  return queryPipeline.toString();
}
