/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import { accumulateMetricsRowTelemetry } from './accumulate_metrics_row_telemetry';
import { createInitialMetricsTelemetry } from '../utils/parse_metrics_response_with_telemetry';

describe('accumulateMetricsRowTelemetry', () => {
  it('does not change telemetry when all arrays are empty', () => {
    const telemetry = createInitialMetricsTelemetry();

    accumulateMetricsRowTelemetry(telemetry, {
      dataStreams: [],
      units: [],
      metricTypes: [],
      fieldTypes: [],
    });

    expect(telemetry).toEqual(createInitialMetricsTelemetry());
  });

  it('counts a single-value metric row', () => {
    const telemetry = createInitialMetricsTelemetry();

    accumulateMetricsRowTelemetry(telemetry, {
      dataStreams: ['metrics-system.cpu-default'],
      units: ['percent'],
      metricTypes: ['gauge'],
      fieldTypes: [ES_FIELD_TYPES.DOUBLE],
    });

    expect(telemetry).toEqual({
      total_number_of_metrics: 0,
      total_number_of_dimensions: 0,
      metrics_by_type: { gauge: 1 },
      units: { percent: 1 },
      multi_value_counts: { data_streams: 0, field_types: 0, metric_types: 0 },
    });
  });

  it('counts null units as none', () => {
    const telemetry = createInitialMetricsTelemetry();

    accumulateMetricsRowTelemetry(telemetry, {
      dataStreams: ['metrics-system.cpu-default'],
      units: [null, null, 'percent'],
      metricTypes: ['gauge'],
      fieldTypes: [ES_FIELD_TYPES.DOUBLE],
    });

    expect(telemetry).toEqual({
      total_number_of_metrics: 0,
      total_number_of_dimensions: 0,
      metrics_by_type: { gauge: 1 },
      units: { none: 2, percent: 1 },
      multi_value_counts: { data_streams: 0, field_types: 0, metric_types: 0 },
    });
  });

  it('accumulates multi-value rows across multiple calls', () => {
    const telemetry = createInitialMetricsTelemetry();

    accumulateMetricsRowTelemetry(telemetry, {
      dataStreams: ['metrics-system.cpu-default', 'metrics-system.cpu-prod'],
      units: ['percent'],
      metricTypes: ['gauge'],
      fieldTypes: [ES_FIELD_TYPES.DOUBLE],
    });

    accumulateMetricsRowTelemetry(telemetry, {
      dataStreams: ['metrics-system.memory-default'],
      units: ['bytes', 'percent'],
      metricTypes: ['gauge', 'counter', 'summary'],
      fieldTypes: [ES_FIELD_TYPES.LONG, ES_FIELD_TYPES.DOUBLE],
    });

    expect(telemetry).toEqual({
      total_number_of_metrics: 0,
      total_number_of_dimensions: 0,
      metrics_by_type: { gauge: 2, counter: 1, summary: 1 },
      units: { percent: 2, bytes: 1 },
      multi_value_counts: { data_streams: 1, field_types: 1, metric_types: 1 },
    });
  });
});
