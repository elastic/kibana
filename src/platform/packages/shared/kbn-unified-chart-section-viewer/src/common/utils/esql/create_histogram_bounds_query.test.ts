/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { ParsedMetricItem } from '../../../types';
import { createHistogramBoundsQuery } from './create_histogram_bounds_query';

const createMetric = (overrides: Partial<ParsedMetricItem>): ParsedMetricItem => ({
  metricName: 'latency.exp',
  indexName: 'metrics-a',
  units: [null],
  metricTypes: ['histogram'],
  fieldTypes: [ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM],
  dimensionFields: [{ name: 'host.name' }],
  ...overrides,
});

describe('createHistogramBoundsQuery', () => {
  it('builds MIN/MAX for an exponential_histogram field on the metric indexName, with no BY', () => {
    expect(
      createHistogramBoundsQuery({
        metricItem: createMetric({}),
        originalSource: 'metrics-*',
      })
    ).toEqual({
      metricKey: 'metrics-a::latency.exp',
      source: 'metrics-a',
      esqlQuery: `TS metrics-a
  | STATS min_value = MIN(latency.exp), max_value = MAX(latency.exp)`,
    });
  });

  it('queries a tdigest field uncast', () => {
    const boundsQuery = createHistogramBoundsQuery({
      metricItem: createMetric({
        metricName: 'latency.tdigest',
        fieldTypes: [ES_FIELD_TYPES.TDIGEST],
      }),
    });

    expect(boundsQuery?.esqlQuery).toContain(
      'STATS min_value = MIN(latency.tdigest), max_value = MAX(latency.tdigest)'
    );
  });

  it('queries a repeated histogram field type', () => {
    const boundsQuery = createHistogramBoundsQuery({
      metricItem: createMetric({
        fieldTypes: [ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM, ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM],
      }),
    });

    expect(boundsQuery?.esqlQuery).toContain(
      'STATS min_value = MIN(latency.exp), max_value = MAX(latency.exp)'
    );
  });

  it('returns undefined when histogram field types conflict across streams', () => {
    expect(
      createHistogramBoundsQuery({
        metricItem: createMetric({
          fieldTypes: [ES_FIELD_TYPES.HISTOGRAM, ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM],
        }),
        originalSource: 'metrics-*',
      })
    ).toBeUndefined();
  });

  it('casts a legacy histogram with TO_TDIGEST', () => {
    const boundsQuery = createHistogramBoundsQuery({
      metricItem: createMetric({
        metricName: 'latency.legacy',
        fieldTypes: [ES_FIELD_TYPES.HISTOGRAM],
      }),
    });

    expect(boundsQuery?.esqlQuery).toContain(
      'STATS min_value = MIN(TO_TDIGEST(latency.legacy)), max_value = MAX(TO_TDIGEST(latency.legacy))'
    );
  });

  it('uses the metric indexName for a comma-separated source', () => {
    const boundsQuery = createHistogramBoundsQuery({
      metricItem: createMetric({ indexName: 'metrics-b' }),
      originalSource: 'metrics-a, metrics-b',
    });

    expect(boundsQuery?.source).toBe('metrics-b');
  });

  it('queries the user source when it is one concrete index, keeping the indexName key', () => {
    const backingIndex = '.ds-metrics-a-2026.09.28-000001';
    const boundsQuery = createHistogramBoundsQuery({
      metricItem: createMetric({}),
      originalSource: backingIndex,
    });

    expect(boundsQuery?.source).toBe(backingIndex);
    expect(boundsQuery?.esqlQuery).toContain(`TS ${backingIndex}`);
    expect(boundsQuery?.metricKey).toBe('metrics-a::latency.exp');
  });

  it.each([
    ['a gauge', createMetric({ metricTypes: ['gauge'], fieldTypes: [ES_FIELD_TYPES.DOUBLE] })],
    [
      'a Prometheus _bucket counter',
      createMetric({
        metricName: 'http_request_duration_seconds_bucket',
        metricTypes: ['counter'],
        fieldTypes: [ES_FIELD_TYPES.DOUBLE],
      }),
    ],
    ['a numeric histogram instrument', createMetric({ fieldTypes: [ES_FIELD_TYPES.DOUBLE] })],
  ])('returns undefined for %s', (_label, metricItem) => {
    expect(createHistogramBoundsQuery({ metricItem, originalSource: 'metrics-*' })).toBeUndefined();
  });

  it('applies the user WHERE clauses before STATS', () => {
    const boundsQuery = createHistogramBoundsQuery({
      metricItem: createMetric({}),
      whereStatements: ['host.name == "a"', '  '],
      originalSource: 'metrics-*',
    });

    expect(boundsQuery?.esqlQuery).toBe(`SET unmapped_fields = "NULLIFY";
TS metrics-a
  | WHERE host.name == "a"
  | STATS min_value = MIN(latency.exp), max_value = MAX(latency.exp)`);
  });

  it('escapes metric names that need backticks', () => {
    const boundsQuery = createHistogramBoundsQuery({
      metricItem: createMetric({ metricName: 'latency.p-99' }),
      originalSource: 'metrics-*',
    });

    expect(boundsQuery?.esqlQuery).toContain('MIN(latency.`p-99`)');
  });
});
