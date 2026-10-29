/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { HistogramBounds, ParsedMetricItem } from '../../../types';
import { createHistogramDistributionQuery } from './create_histogram_distribution_query';

const createMetric = (overrides: Partial<ParsedMetricItem> = {}): ParsedMetricItem => ({
  metricName: 'latency.exp',
  indexName: 'metrics-a',
  units: [null],
  metricTypes: ['histogram'],
  fieldTypes: [ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM],
  dimensionFields: [{ name: 'host.name' }],
  ...overrides,
});

const bounds: HistogramBounds = { min: 1, max: 250 };

describe('createHistogramDistributionQuery', () => {
  it('builds the distribution query for an exponential_histogram field', () => {
    expect(
      createHistogramDistributionQuery({
        metricItem: createMetric(),
        bounds,
        originalSource: 'metrics-*',
      })
    ).toBe(`TS metrics-a
  | STATS count = COUNT(latency.exp, bucket) BY bucket = BUCKET(latency.exp, 10, 1, 250), TBUCKET(100)
  | EVAL bucket = RANGE_MIN(bucket)
  | SORT bucket DESC`);
  });

  it('uses a tdigest field directly', () => {
    const query = createHistogramDistributionQuery({
      metricItem: createMetric({
        metricName: 'latency.tdigest',
        fieldTypes: [ES_FIELD_TYPES.TDIGEST],
      }),
      bounds,
    });

    expect(query).toBe(`TS metrics-a
  | STATS count = COUNT(latency.tdigest, bucket) BY bucket = BUCKET(latency.tdigest, 10, 1, 250), TBUCKET(100)
  | EVAL bucket = RANGE_MIN(bucket)
  | SORT bucket DESC`);
  });

  it('casts a legacy histogram with TO_TDIGEST', () => {
    const query = createHistogramDistributionQuery({
      metricItem: createMetric({
        metricName: 'latency.legacy',
        fieldTypes: [ES_FIELD_TYPES.HISTOGRAM],
      }),
      bounds,
    });

    expect(query).toBe(`TS metrics-a
  | STATS count = COUNT(TO_TDIGEST(latency.legacy), bucket) BY bucket = BUCKET(TO_TDIGEST(latency.legacy), 10, 1, 250), TBUCKET(100)
  | EVAL bucket = RANGE_MIN(bucket)
  | SORT bucket DESC`);
  });

  it('omits NULLIFY when WHERE cannot name an extra column', () => {
    const query = createHistogramDistributionQuery({
      metricItem: createMetric(),
      bounds,
      whereStatements: ['@timestamp IS NOT NULL', '1 == 1', '  '],
      originalSource: 'metrics-*',
    });

    expect(query?.startsWith('SET unmapped_fields = "NULLIFY";\n')).toBe(false);
    expect(query).toContain('| WHERE @timestamp IS NOT NULL');
    expect(query).toContain('| WHERE 1 == 1');
  });

  it('applies the user WHERE clauses before STATS', () => {
    const query = createHistogramDistributionQuery({
      metricItem: createMetric(),
      bounds,
      whereStatements: ['host.name == "a"', '  '],
      originalSource: 'metrics-*',
    });

    expect(query).toBe(`SET unmapped_fields = "NULLIFY";
TS metrics-a
  | WHERE host.name == "a"
  | STATS count = COUNT(latency.exp, bucket) BY bucket = BUCKET(latency.exp, 10, 1, 250), TBUCKET(100)
  | EVAL bucket = RANGE_MIN(bucket)
  | SORT bucket DESC`);
  });

  it('opens a positive span when min equals max', () => {
    expect(
      createHistogramDistributionQuery({
        metricItem: createMetric(),
        bounds: { min: 5, max: 5 },
      })
    ).toContain('BUCKET(latency.exp, 10, 5, 5.000005)');
  });

  it('returns undefined for a non-histogram instrument', () => {
    expect(
      createHistogramDistributionQuery({
        metricItem: createMetric({ metricTypes: ['gauge'], fieldTypes: [ES_FIELD_TYPES.DOUBLE] }),
        bounds,
      })
    ).toBeUndefined();
  });
});
