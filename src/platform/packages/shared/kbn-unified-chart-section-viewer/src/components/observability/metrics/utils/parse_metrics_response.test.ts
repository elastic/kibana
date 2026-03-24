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
import { parseMetricsResponse } from './parse_metrics_response';

describe('parseMetricsResponse', () => {
  it('returns empty metricItems and allDimensions for empty input', () => {
    expect(parseMetricsResponse([])).toEqual({
      metricItems: [],
      allDimensions: [],
    });
  });

  it('returns empty metricItems and allDimensions for empty array', () => {
    const response: MetricsESQLResponse[] = [];
    expect(parseMetricsResponse(response)).toEqual({
      metricItems: [],
      allDimensions: [],
    });
  });

  it('returns units: [] when unit is null', () => {
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
    const result = parseMetricsResponse(response);
    expect(result).toEqual({
      metricItems: [
        {
          metricName: 'my.metric',
          dataStream: 'my-index',
          metricTypes: ['gauge'],
          fieldTypes: [ES_FIELD_TYPES.DOUBLE],
          units: [],
          dimensionFields: [{ name: 'host.name' }],
        },
      ],
      allDimensions: [{ name: 'host.name' }],
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
    const result = parseMetricsResponse(response);
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
    const result = parseMetricsResponse(response);
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
    const result = parseMetricsResponse(response);
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
    const result = parseMetricsResponse(response);
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
    ];
    const result = parseMetricsResponse(response);
    expect(result.allDimensions).toHaveLength(3);
    const dimensionNames = result.allDimensions.map((d) => d.name);
    expect(dimensionNames).toContain('host.name');
    expect(dimensionNames).toContain('pod.name');
    expect(dimensionNames).toContain('container.id');
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
      const result = parseMetricsResponse(response, getFieldType);
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
      const result = parseMetricsResponse(response, getFieldType);
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
      const result = parseMetricsResponse(response, getFieldType);
      expect(result.allDimensions).toEqual([
        { name: 'host.name', type: 'keyword' },
        { name: 'container.id', type: 'keyword' },
      ]);
    });
  });
});
