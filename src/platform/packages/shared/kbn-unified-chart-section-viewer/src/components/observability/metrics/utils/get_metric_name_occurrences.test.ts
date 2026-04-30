/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricsESQLResponse } from '../../../../types';
import { getMetricNameOccurrences } from './get_metric_name_occurrences';

describe('getMetricNameOccurrences', () => {
  it('returns an empty map for an empty response', () => {
    expect(getMetricNameOccurrences([])).toEqual(new Map());
  });

  it('counts each unique metric name once', () => {
    const response: MetricsESQLResponse[] = [
      createMetric('cpu'),
      createMetric('memory'),
      createMetric('disk'),
    ];

    const result = getMetricNameOccurrences(response);

    expect(result.size).toBe(3);
    expect(result.get('cpu')).toBe(1);
    expect(result.get('memory')).toBe(1);
    expect(result.get('disk')).toBe(1);
  });

  it('counts duplicate metric names', () => {
    const response: MetricsESQLResponse[] = [
      createMetric('cpu'),
      createMetric('cpu'),
      createMetric('memory'),
      createMetric('cpu'),
    ];

    const result = getMetricNameOccurrences(response);

    expect(result.size).toBe(2);
    expect(result.get('cpu')).toBe(3);
    expect(result.get('memory')).toBe(1);
  });
});

const createMetric = (name: string): MetricsESQLResponse => ({
  metric_name: name,
  data_stream: ['test-data-stream'],
  unit: null,
  metric_type: 'gauge',
  field_type: 'double' as MetricsESQLResponse['field_type'],
  dimension_fields: [],
});
