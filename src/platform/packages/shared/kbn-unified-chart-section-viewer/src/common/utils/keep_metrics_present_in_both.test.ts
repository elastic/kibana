/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { ParsedMetricItem } from '../../types';
import { keepMetricsPresentInBoth } from './keep_metrics_present_in_both';

const metric = (metricName: string, indexName = 'metrics-a'): ParsedMetricItem => ({
  metricName,
  indexName,
  units: [null],
  metricTypes: ['gauge'],
  fieldTypes: [ES_FIELD_TYPES.DOUBLE],
  dimensionFields: [{ name: 'attributes.service.name' }],
});

describe('keepMetricsPresentInBoth', () => {
  it('keeps only names present in both lists', () => {
    const capable = [metric('demo.dimension.sentinel'), metric('demo.dimension.named_only')];
    const withData = [metric('demo.dimension.sentinel'), metric('demo.request.rate')];

    expect(keepMetricsPresentInBoth(capable, withData).map((item) => item.metricName)).toEqual([
      'demo.dimension.sentinel',
    ]);
  });

  it('does not match the same metric name on a different data stream', () => {
    const capable = [metric('demo.dimension.sentinel', 'metrics-a')];
    const withData = [metric('demo.dimension.sentinel', 'metrics-b')];

    expect(keepMetricsPresentInBoth(capable, withData)).toEqual([]);
  });

  it('preserves capable order and leaves unrelated capable items untouched', () => {
    const capable = [metric('b'), metric('a'), metric('c')];
    const withData = [metric('c'), metric('a')];

    expect(keepMetricsPresentInBoth(capable, withData).map((item) => item.metricName)).toEqual([
      'a',
      'c',
    ]);
  });

  it('returns an empty list when either side is empty', () => {
    expect(keepMetricsPresentInBoth([metric('a')], [])).toEqual([]);
    expect(keepMetricsPresentInBoth([], [metric('a')])).toEqual([]);
  });

  it('matches membership rows that only carry identity fields', () => {
    const capable = [metric('demo.dimension.sentinel')];
    const withData = [{ indexName: 'metrics-a', metricName: 'demo.dimension.sentinel' }];

    expect(keepMetricsPresentInBoth(capable, withData).map((item) => item.metricName)).toEqual([
      'demo.dimension.sentinel',
    ]);
  });
});
