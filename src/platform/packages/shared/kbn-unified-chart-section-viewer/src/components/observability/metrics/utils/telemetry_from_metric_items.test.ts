/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { ParsedMetricItem } from '../../../../types';
import { telemetryFromMetricItems } from './telemetry_from_metric_items';

const createItem = (overrides: Partial<ParsedMetricItem> = {}): ParsedMetricItem => ({
  metricName: 'demo.metric',
  indexName: 'metrics-*',
  units: [null],
  metricTypes: ['gauge'],
  fieldTypes: [ES_FIELD_TYPES.DOUBLE],
  dimensionFields: [{ name: 'host.name' }],
  ...overrides,
});

describe('telemetryFromMetricItems', () => {
  it('returns empty telemetry for no cards', () => {
    expect(telemetryFromMetricItems([])).toEqual({
      total_number_of_metrics: 0,
      total_number_of_dimensions: 0,
      metrics_by_type: {},
      units: {},
      multi_value_counts: { index_names: 0, field_types: 0, metric_types: 0, units: 0 },
    });
  });

  it('recomputes type, unit, and dimension counts from the shown cards', () => {
    const items: ParsedMetricItem[] = [
      createItem({
        metricName: 'demo.a',
        metricTypes: ['gauge'],
        units: ['percent'],
        dimensionFields: [{ name: 'host.name' }],
      }),
      createItem({
        metricName: 'demo.b',
        metricTypes: ['counter'],
        units: ['bytes'],
        dimensionFields: [{ name: 'host.name' }, { name: 'service.name' }],
      }),
    ];

    expect(telemetryFromMetricItems(items)).toEqual({
      total_number_of_metrics: 2,
      total_number_of_dimensions: 2,
      metrics_by_type: { gauge: 1, counter: 1 },
      units: { percent: 1, bytes: 1 },
      multi_value_counts: { index_names: 0, field_types: 0, metric_types: 0, units: 0 },
    });
  });
});
