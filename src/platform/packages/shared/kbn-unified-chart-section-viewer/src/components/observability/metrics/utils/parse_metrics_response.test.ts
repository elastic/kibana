/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricsESQLResponseObject } from './parse_metrics_response';
import { parseMetricsResponse } from './parse_metrics_response';

describe('parseMetricsResponse', () => {
  it('returns empty metrics and allDimensions for empty input', () => {
    expect(parseMetricsResponse([])).toEqual({
      metrics: [],
      allDimensions: [],
    });
  });

  it('returns empty metrics and allDimensions for empty array', () => {
    const response: MetricsESQLResponseObject[] = [];
    expect(parseMetricsResponse(response)).toEqual({
      metrics: [],
      allDimensions: [],
    });
  });

  it('returns units: [] when unit is null', () => {
    const response: MetricsESQLResponseObject[] = [
      {
        metric_name: 'my.metric',
        data_stream: 'my-index',
        unit: null,
        metric_type: 'gauge',
        field_type: 'double',
        dimension_fields: ['host.name'],
      },
    ];
    const result = parseMetricsResponse(response);
    expect(result).toEqual({
      metrics: [
        {
          metricName: 'my.metric',
          dataStream: 'my-index',
          metricTypes: ['gauge'],
          fieldTypes: ['double'],
          units: [],
          dimensionFields: ['host.name'],
        },
      ],
      allDimensions: ['host.name'],
    });
  });

  it('returns one metric when data_stream is a single string', () => {
    const response: MetricsESQLResponseObject[] = [
      {
        metric_name: 'cpu.usage',
        data_stream: 'my-index',
        unit: 'percent',
        metric_type: 'gauge',
        field_type: 'double',
        dimension_fields: ['host.name'],
      },
    ];
    const result = parseMetricsResponse(response);
    expect(result).toEqual({
      metrics: [
        {
          metricName: 'cpu.usage',
          dataStream: 'my-index',
          metricTypes: ['gauge'],
          fieldTypes: ['double'],
          units: ['percent'],
          dimensionFields: ['host.name'],
        },
      ],
      allDimensions: ['host.name'],
    });
  });

  it('returns two metrics when data_stream is an array of two', () => {
    const response: MetricsESQLResponseObject[] = [
      {
        metric_name: 'cpu.usage',
        data_stream: ['stream-a', 'stream-b'],
        unit: 'percent',
        metric_type: 'gauge',
        field_type: 'double',
        dimension_fields: 'host.name',
      },
    ];
    const result = parseMetricsResponse(response);
    expect(result).toEqual({
      metrics: [
        {
          metricName: 'cpu.usage',
          dataStream: 'stream-a',
          metricTypes: ['gauge'],
          fieldTypes: ['double'],
          units: ['percent'],
          dimensionFields: ['host.name'],
        },
        {
          metricName: 'cpu.usage',
          dataStream: 'stream-b',
          metricTypes: ['gauge'],
          fieldTypes: ['double'],
          units: ['percent'],
          dimensionFields: ['host.name'],
        },
      ],
      allDimensions: ['host.name'],
    });
  });

  it('normalises single string metric_type, field_type and dimension_fields to one-element arrays', () => {
    const response: MetricsESQLResponseObject[] = [
      {
        metric_name: 'my.metric',
        data_stream: 'my-index',
        unit: 'byte',
        metric_type: 'gauge',
        field_type: 'double',
        dimension_fields: 'host.name',
      },
    ];
    const result = parseMetricsResponse(response);
    expect(result).toEqual({
      metrics: [
        {
          metricName: 'my.metric',
          dataStream: 'my-index',
          metricTypes: ['gauge'],
          fieldTypes: ['double'],
          units: ['byte'],
          dimensionFields: ['host.name'],
        },
      ],
      allDimensions: ['host.name'],
    });
  });

  it('preserves arrays for metric_type, field_type and dimension_fields', () => {
    const response: MetricsESQLResponseObject[] = [
      {
        metric_name: 'my.metric',
        data_stream: 'my-index',
        unit: ['byte'],
        metric_type: ['gauge', 'counter'],
        field_type: ['double', 'long'],
        dimension_fields: ['host.name', 'pod.name'],
      },
    ];
    const result = parseMetricsResponse(response);
    expect(result).toEqual({
      metrics: [
        {
          metricName: 'my.metric',
          dataStream: 'my-index',
          metricTypes: ['gauge', 'counter'],
          fieldTypes: ['double', 'long'],
          units: ['byte'],
          dimensionFields: ['host.name', 'pod.name'],
        },
      ],
      allDimensions: ['host.name', 'pod.name'],
    });
  });

  it('returns allDimensions as union of all dimension_fields across rows with no duplicates', () => {
    const response: MetricsESQLResponseObject[] = [
      {
        metric_name: 'metric.a',
        data_stream: 'ds-1',
        unit: 'percent',
        metric_type: 'gauge',
        field_type: 'double',
        dimension_fields: ['host.name', 'pod.name'],
      },
      {
        metric_name: 'metric.b',
        data_stream: 'ds-2',
        unit: 'byte',
        metric_type: 'counter',
        field_type: 'long',
        dimension_fields: ['host.name', 'container.id'],
      },
      {
        metric_name: 'metric.b',
        data_stream: 'ds-2',
        unit: 'byte',
        metric_type: 'counter',
        field_type: 'long',
        dimension_fields: [],
      },
    ];
    const result = parseMetricsResponse(response);
    expect(result.allDimensions).toHaveLength(3);
    expect(result.allDimensions).toContain('host.name');
    expect(result.allDimensions).toContain('pod.name');
    expect(result.allDimensions).toContain('container.id');
  });
});
