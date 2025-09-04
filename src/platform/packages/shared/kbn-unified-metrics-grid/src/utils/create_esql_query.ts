/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { synth, Parser, BasicPrettyPrinter } from '@kbn/esql-ast';

interface CreateESQLQueryParams {
  metricName: string;
  index?: string;
  timeSeriesMetric?: string;
  dimensions?: string[];
  filters?: Array<{ field: string; value: string }>;
}

export function createESQLQuery({
  index = 'metrics-*',
  timeSeriesMetric,
  dimensions = [],
  metricName,
  filters,
}: CreateESQLQueryParams) {
  // Build dimension part for ES|QL query
  const dimensionFields =
    dimensions && dimensions.length > 0
      ? dimensions.map((dim: string) => `\`${dim}\``).join(', ')
      : '';

  const { root } = Parser.parse(`TS ${index}`);

  if (filters && filters.length) {
    const valuesByField = new Map<string, Set<string>>();

    for (const filter of filters) {
      if (valuesByField.has(filter.field)) {
        const values = valuesByField.get(filter.field);
        values?.add(filter.value);
      } else {
        valuesByField.set(filter.field, new Set([filter.value]));
      }
    }

    const whereConditions: string[] = [];
    valuesByField.forEach((value, key) => {
      const values = [...value].map((v) => `"${v}"`).join(', ');
      whereConditions.push(`${key} IN (${values})`);
    });

    root.commands.push(synth.cmd(`WHERE ${whereConditions.join(' AND ')}`));
  }

  // Choose ES|QL query based on time_series_metric type
  if (timeSeriesMetric === 'counter') {
    root.commands.push(
      synth.cmd(`
        STATS SUM(RATE(\`${metricName}\`)) BY BUCKET(\`@timestamp\`, 100, ?_tstart, ?_tend)${
        dimensionFields ? `, ${dimensionFields}` : ''
      }`)
    );
  } else if (timeSeriesMetric === 'gauge') {
    root.commands.push(
      synth.cmd(`
        STATS AVG(\`${metricName}\`) BY BUCKET(\`@timestamp\`, 100, ?_tstart, ?_tend)${
        dimensionFields ? `, ${dimensionFields}` : ''
      }`)
    );
  } else {
    // Default fallback for other metric types
    root.commands.push(
      synth.cmd(`
        STATS AVG(\`${metricName}\`) BY BUCKET(\`@timestamp\`, 100, ?_tstart, ?_tend)${
        dimensionFields ? `, ${dimensionFields}` : ''
      }`)
    );
  }

  return BasicPrettyPrinter.print(root);
}
