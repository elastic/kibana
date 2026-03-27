/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { MetricsESQLResponse } from '../../../../types';
import {
  createInitialMetricsTelemetry,
  parseMetricsWithTelemetry,
} from './parse_metrics_response_with_telemetry';
import { sum } from 'lodash';

describe('parseMetricsWithTelemetry', () => {
  it('returns empty metricItems and allDimensions for empty input', () => {
    expect(parseMetricsWithTelemetry([])).toEqual({
      metricItems: [],
      allDimensions: [],
      telemetry: createInitialMetricsTelemetry(),
    });
  });

  it('returns units: [null] when unit is null', () => {
    const response: MetricsESQLResponse[] = [
      {
        metric_name: 'my.metric',
        data_stream: 'my-index',
        unit: null,
        metric_type: 'gauge',
        field_type: ES_FIELD_TYPES.DOUBLE,
        dimension_fields: ['host.name'],
      },
    ];
    const result = parseMetricsWithTelemetry(response);
    expect(result).toEqual({
      metricItems: [
        {
          metricName: 'my.metric',
          dataStream: 'my-index',
          metricTypes: ['gauge'],
          fieldTypes: [ES_FIELD_TYPES.DOUBLE],
          units: [null],
          dimensionFields: [{ name: 'host.name' }],
        },
      ],
      allDimensions: [{ name: 'host.name' }],
      telemetry: {
        total_number_of_metrics: 1,
        total_number_of_dimensions: 1,
        metrics_by_type: { gauge: 1 },
        units: { none: 1 },
        multi_value_counts: {
          data_streams: 0,
          field_types: 0,
          metric_types: 0,
        },
      },
    });
  });

  it('returns one metric when data_stream is a single string', () => {
    const response: MetricsESQLResponse[] = [
      {
        metric_name: 'cpu.usage',
        data_stream: 'my-index',
        unit: ['percent'],
        metric_type: 'gauge',
        field_type: ES_FIELD_TYPES.DOUBLE,
        dimension_fields: ['host.name'],
      },
    ];
    const result = parseMetricsWithTelemetry(response);
    expect(result).toEqual({
      metricItems: [
        {
          metricName: 'cpu.usage',
          dataStream: 'my-index',
          metricTypes: ['gauge'],
          fieldTypes: [ES_FIELD_TYPES.DOUBLE],
          units: ['percent'],
          dimensionFields: [{ name: 'host.name' }],
        },
      ],
      allDimensions: [{ name: 'host.name' }],
      telemetry: {
        total_number_of_metrics: 1,
        total_number_of_dimensions: 1,
        metrics_by_type: { gauge: 1 },
        units: { percent: 1 },
        multi_value_counts: {
          data_streams: 0,
          field_types: 0,
          metric_types: 0,
        },
      },
    });
  });

  it('returns two metrics when data_stream is an array of two', () => {
    const response: MetricsESQLResponse[] = [
      {
        metric_name: 'cpu.usage',
        data_stream: ['stream-a', 'stream-b'],
        unit: ['percent'],
        metric_type: 'gauge',
        field_type: ES_FIELD_TYPES.DOUBLE,
        dimension_fields: 'host.name',
      },
    ];
    const result = parseMetricsWithTelemetry(response);
    expect(result).toEqual({
      metricItems: [
        {
          metricName: 'cpu.usage',
          dataStream: 'stream-a',
          metricTypes: ['gauge'],
          fieldTypes: [ES_FIELD_TYPES.DOUBLE],
          units: ['percent'],
          dimensionFields: [{ name: 'host.name' }],
        },
        {
          metricName: 'cpu.usage',
          dataStream: 'stream-b',
          metricTypes: ['gauge'],
          fieldTypes: [ES_FIELD_TYPES.DOUBLE],
          units: ['percent'],
          dimensionFields: [{ name: 'host.name' }],
        },
      ],
      allDimensions: [{ name: 'host.name' }],
      telemetry: {
        total_number_of_metrics: 1,
        total_number_of_dimensions: 1,
        metrics_by_type: { gauge: 1 },
        units: { percent: 1 },
        multi_value_counts: {
          data_streams: 1,
          field_types: 0,
          metric_types: 0,
        },
      },
    });
  });

  it('normalises single string metric_type, field_type and dimension_fields to one-element arrays', () => {
    const response: MetricsESQLResponse[] = [
      {
        metric_name: 'my.metric',
        data_stream: 'my-index',
        unit: ['bytes'],
        metric_type: 'gauge',
        field_type: ES_FIELD_TYPES.DOUBLE,
        dimension_fields: 'host.name',
      },
    ];
    const result = parseMetricsWithTelemetry(response);
    expect(result).toEqual({
      metricItems: [
        {
          metricName: 'my.metric',
          dataStream: 'my-index',
          metricTypes: ['gauge'],
          fieldTypes: [ES_FIELD_TYPES.DOUBLE],
          units: ['bytes'],
          dimensionFields: [{ name: 'host.name' }],
        },
      ],
      allDimensions: [{ name: 'host.name' }],
      telemetry: {
        total_number_of_metrics: 1,
        total_number_of_dimensions: 1,
        metrics_by_type: { gauge: 1 },
        units: { bytes: 1 },
        multi_value_counts: {
          data_streams: 0,
          field_types: 0,
          metric_types: 0,
        },
      },
    });
  });

  it('preserves arrays for metric_type, field_type and dimension_fields', () => {
    const response: MetricsESQLResponse[] = [
      {
        metric_name: 'my.metric',
        data_stream: 'my-index',
        unit: ['bytes'],
        metric_type: ['gauge', 'counter'],
        field_type: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.LONG],
        dimension_fields: ['host.name', 'pod.name'],
      },
    ];
    const result = parseMetricsWithTelemetry(response);
    expect(result).toEqual({
      metricItems: [
        {
          metricName: 'my.metric',
          dataStream: 'my-index',
          metricTypes: ['gauge', 'counter'],
          fieldTypes: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.LONG],
          units: ['bytes'],
          dimensionFields: [{ name: 'host.name' }, { name: 'pod.name' }],
        },
      ],
      allDimensions: [{ name: 'host.name' }, { name: 'pod.name' }],
      telemetry: {
        total_number_of_metrics: 1,
        total_number_of_dimensions: 2,
        metrics_by_type: { gauge: 1, counter: 1 },
        units: { bytes: 1 },
        multi_value_counts: {
          data_streams: 0,
          field_types: 1,
          metric_types: 1,
        },
      },
    });
  });

  it('returns allDimensions as union of all dimension_fields across rows with no duplicates', () => {
    const response: MetricsESQLResponse[] = [
      {
        metric_name: 'metric.a',
        data_stream: 'ds-1',
        unit: ['percent'],
        metric_type: 'gauge',
        field_type: ES_FIELD_TYPES.DOUBLE,
        dimension_fields: ['host.name', 'pod.name'],
      },
      {
        metric_name: 'metric.b',
        data_stream: 'ds-2',
        unit: ['bytes'],
        metric_type: 'counter',
        field_type: ES_FIELD_TYPES.LONG,
        dimension_fields: ['host.name', 'container.id'],
      },
      {
        metric_name: 'metric.b',
        data_stream: 'ds-2',
        unit: ['bytes'],
        metric_type: 'counter',
        field_type: ES_FIELD_TYPES.LONG,
        dimension_fields: [],
      },
      {
        metric_name: 'unsupported.row',
        data_stream: 'ds-unsupported',
        unit: ['bytes'],
        metric_type: 'summary' as unknown as MetricsESQLResponse['metric_type'],
        field_type: ES_FIELD_TYPES.DOUBLE,
        dimension_fields: ['host.name'],
      },
    ];
    const result = parseMetricsWithTelemetry(response);
    expect(result.allDimensions).toHaveLength(3);
    const dimensionNames = result.allDimensions.map((d) => d.name);
    expect(dimensionNames).toContain('host.name');
    expect(dimensionNames).toContain('pod.name');
    expect(dimensionNames).toContain('container.id');
    expect(result.metricItems).toHaveLength(3);
    expect(result.telemetry).toEqual({
      total_number_of_metrics: 4,
      total_number_of_dimensions: 3,
      metrics_by_type: { gauge: 1, counter: 2, summary: 1 },
      units: { percent: 1, bytes: 3 },
      multi_value_counts: {
        data_streams: 0,
        field_types: 0,
        metric_types: 0,
      },
    });
    const totalNumberOfMetrics = sum(Object.values(result.telemetry.metrics_by_type));
    expect(result.telemetry.total_number_of_metrics).toBe(totalNumberOfMetrics);
  });

  describe('internal dimension filtering', () => {
    it('filters out internal dimension _metric_names_hash', () => {
      const response: MetricsESQLResponse[] = [
        {
          metric_name: 'cpu.usage',
          data_stream: 'my-index',
          unit: ['percent'],
          metric_type: 'gauge',
          field_type: ES_FIELD_TYPES.DOUBLE,
          dimension_fields: ['host.name', '_metric_names_hash'],
        },
      ];
      const result = parseMetricsWithTelemetry(response);
      expect(result.metricItems[0].dimensionFields).toEqual([{ name: 'host.name' }]);
      expect(result.allDimensions).toEqual([{ name: 'host.name' }]);
    });

    it('filters out internal dimension unit', () => {
      const response: MetricsESQLResponse[] = [
        {
          metric_name: 'cpu.usage',
          data_stream: 'my-index',
          unit: ['percent'],
          metric_type: 'gauge',
          field_type: ES_FIELD_TYPES.DOUBLE,
          dimension_fields: ['host.name', 'unit'],
        },
      ];
      const result = parseMetricsWithTelemetry(response);
      expect(result.metricItems[0].dimensionFields).toEqual([{ name: 'host.name' }]);
      expect(result.allDimensions).toEqual([{ name: 'host.name' }]);
    });

    it('filters out internal dimensions with labels._ prefix', () => {
      const response: MetricsESQLResponse[] = [
        {
          metric_name: 'cpu.usage',
          data_stream: 'my-index',
          unit: ['percent'],
          metric_type: 'gauge',
          field_type: ES_FIELD_TYPES.DOUBLE,
          dimension_fields: ['host.name', 'labels._foo_', 'labels._bar_baz_'],
        },
      ];
      const result = parseMetricsWithTelemetry(response);
      expect(result.metricItems[0].dimensionFields).toEqual([{ name: 'host.name' }]);
      expect(result.allDimensions).toEqual([{ name: 'host.name' }]);
    });

    it('filters out all internal dimensions while keeping valid ones', () => {
      const response: MetricsESQLResponse[] = [
        {
          metric_name: 'cpu.usage',
          data_stream: 'my-index',
          unit: ['percent'],
          metric_type: 'gauge',
          field_type: ES_FIELD_TYPES.DOUBLE,
          dimension_fields: [
            'host.name',
            '_metric_names_hash',
            'unit',
            'labels._internal_',
            'pod.name',
          ],
        },
      ];
      const result = parseMetricsWithTelemetry(response);
      expect(result.metricItems[0].dimensionFields).toEqual([
        { name: 'host.name' },
        { name: 'pod.name' },
      ]);
      expect(result.allDimensions).toEqual([{ name: 'host.name' }, { name: 'pod.name' }]);
    });

    it('does not filter non-internal labels dimensions', () => {
      const response: MetricsESQLResponse[] = [
        {
          metric_name: 'cpu.usage',
          data_stream: 'my-index',
          unit: ['percent'],
          metric_type: 'gauge',
          field_type: ES_FIELD_TYPES.DOUBLE,
          dimension_fields: ['labels.environment', 'labels.team'],
        },
      ];
      const result = parseMetricsWithTelemetry(response);
      expect(result.metricItems[0].dimensionFields).toEqual([
        { name: 'labels.environment' },
        { name: 'labels.team' },
      ]);
      expect(result.allDimensions).toEqual([
        { name: 'labels.environment' },
        { name: 'labels.team' },
      ]);
    });
  });

  describe('with getFieldType', () => {
    const getFieldType = (name: string): string | undefined => {
      const types: Record<string, string> = {
        'host.name': 'keyword',
        'pod.name': 'keyword',
        'container.id': 'keyword',
      };
      return types[name];
    };

    it('enriches dimensionFields and allDimensions with type from getFieldType', () => {
      const response: MetricsESQLResponse[] = [
        {
          metric_name: 'cpu.usage',
          data_stream: 'my-index',
          unit: ['percent'],
          metric_type: 'gauge',
          field_type: ES_FIELD_TYPES.DOUBLE,
          dimension_fields: ['host.name', 'pod.name'],
        },
      ];
      const result = parseMetricsWithTelemetry(response, getFieldType);
      expect(result.metricItems[0].dimensionFields).toEqual([
        { name: 'host.name', type: 'keyword' },
        { name: 'pod.name', type: 'keyword' },
      ]);
      expect(result.allDimensions).toEqual([
        { name: 'host.name', type: 'keyword' },
        { name: 'pod.name', type: 'keyword' },
      ]);
    });

    it('omits type when getFieldType returns undefined for a dimension', () => {
      const response: MetricsESQLResponse[] = [
        {
          metric_name: 'cpu.usage',
          data_stream: 'my-index',
          unit: ['percent'],
          metric_type: 'gauge',
          field_type: ES_FIELD_TYPES.DOUBLE,
          dimension_fields: ['host.name', 'unknown.field'],
        },
      ];
      const result = parseMetricsWithTelemetry(response, getFieldType);
      expect(result.metricItems[0].dimensionFields).toEqual([
        { name: 'host.name', type: 'keyword' },
        { name: 'unknown.field' },
      ]);
      expect(result.allDimensions).toEqual([
        { name: 'host.name', type: 'keyword' },
        { name: 'unknown.field' },
      ]);
    });

    it('enriches allDimensions across multiple metrics', () => {
      const response: MetricsESQLResponse[] = [
        {
          metric_name: 'metric.a',
          data_stream: 'ds-1',
          unit: ['percent'],
          metric_type: 'gauge',
          field_type: ES_FIELD_TYPES.DOUBLE,
          dimension_fields: ['host.name'],
        },
        {
          metric_name: 'metric.b',
          data_stream: 'ds-2',
          unit: ['bytes'],
          metric_type: 'counter',
          field_type: ES_FIELD_TYPES.LONG,
          dimension_fields: ['container.id'],
        },
      ];
      const result = parseMetricsWithTelemetry(response, getFieldType);
      expect(result.allDimensions).toEqual([
        { name: 'host.name', type: 'keyword' },
        { name: 'container.id', type: 'keyword' },
      ]);
    });
  });
});
