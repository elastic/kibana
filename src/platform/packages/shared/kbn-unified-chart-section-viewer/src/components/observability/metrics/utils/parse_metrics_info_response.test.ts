/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { parseMetricsInfoResponse } from './parse_metrics_info_response';

const METRICS_INFO_COLUMNS = [
  { name: 'metric_name', type: 'keyword' as const },
  { name: 'data_stream', type: 'keyword' as const },
  { name: 'unit', type: 'keyword' as const },
  { name: 'metric_type', type: 'keyword' as const },
  { name: 'field_type', type: 'keyword' as const },
  { name: 'dimension_fields', type: 'keyword' as const },
];

describe('parseMetricsInfoResponse', () => {
  it('returns empty metricFields and allDimensionFields for empty columns and values', () => {
    expect(parseMetricsInfoResponse({ columns: [], values: [] })).toEqual({
      metricFields: [],
      allDimensionFields: [],
    });
  });

  it('returns empty metricFields and allDimensionFields for empty values', () => {
    expect(
      parseMetricsInfoResponse({
        columns: METRICS_INFO_COLUMNS,
        values: [],
      })
    ).toEqual({ metricFields: [], allDimensionFields: [] });
  });

  it('returns units: [] when unit column is null', () => {
    const response: ESQLSearchResponse = {
      columns: METRICS_INFO_COLUMNS,
      values: [['my.metric', 'my-index', null, 'gauge', 'double', ['host.name']]],
    };
    const result = parseMetricsInfoResponse(response);
    expect(result).toEqual({
      metricFields: [
        {
          name: 'my.metric',
          dataStreams: ['my-index'],
          metricTypes: ['gauge'],
          fieldtypes: ['double'],
          units: null,
          dimensions: ['host.name'],
        },
      ],
      allDimensionFields: ['host.name'],
    });
  });

  it('returns one metricField when data_stream is a single string', () => {
    const response: ESQLSearchResponse = {
      columns: METRICS_INFO_COLUMNS,
      values: [['cpu.usage', 'my-index', 'percent', 'gauge', 'double', ['host.name']]],
    };
    const result = parseMetricsInfoResponse(response);
    expect(result).toEqual({
      metricFields: [
        {
          name: 'cpu.usage',
          dataStreams: ['my-index'],
          metricTypes: ['gauge'],
          fieldtypes: ['double'],
          units: ['percent'],
          dimensions: ['host.name'],
        },
      ],
      allDimensionFields: ['host.name'],
    });
  });

  it('returns two metricFields when data_stream is an array of two', () => {
    const response: ESQLSearchResponse = {
      columns: METRICS_INFO_COLUMNS,
      values: [['cpu.usage', ['stream-a', 'stream-b'], 'percent', 'gauge', 'double', 'host.name']],
    };
    const result = parseMetricsInfoResponse(response);
    expect(result).toEqual({
      metricFields: [
        {
          name: 'cpu.usage',
          dataStreams: ['stream-a'],
          metricTypes: ['gauge'],
          fieldtypes: ['double'],
          units: ['percent'],
          dimensions: ['host.name'],
        },
        {
          name: 'cpu.usage',
          dataStreams: ['stream-b'],
          metricTypes: ['gauge'],
          fieldtypes: ['double'],
          units: ['percent'],
          dimensions: ['host.name'],
        },
      ],
      allDimensionFields: ['host.name'],
    });
  });

  it('normalises single string metric_type, field_type and dimension_fields to one-element arrays', () => {
    const response: ESQLSearchResponse = {
      columns: METRICS_INFO_COLUMNS,
      values: [['my.metric', 'my-index', 'byte', 'gauge', 'double', 'host.name']],
    };
    const result = parseMetricsInfoResponse(response);
    expect(result).toEqual({
      metricFields: [
        {
          name: 'my.metric',
          dataStreams: ['my-index'],
          metricTypes: ['gauge'],
          fieldtypes: ['double'],
          units: ['byte'],
          dimensions: ['host.name'],
        },
      ],
      allDimensionFields: ['host.name'],
    });
  });

  it('preserves arrays for metric_type, field_type and dimension_fields', () => {
    const response: ESQLSearchResponse = {
      columns: METRICS_INFO_COLUMNS,
      values: [
        [
          'my.metric',
          'my-index',
          ['byte', null],
          ['gauge', 'counter'],
          ['double', 'long'],
          ['host.name', 'pod.name'],
        ],
      ],
    };
    const result = parseMetricsInfoResponse(response);
    expect(result).toEqual({
      metricFields: [
        {
          name: 'my.metric',
          dataStreams: ['my-index'],
          metricTypes: ['gauge', 'counter'],
          fieldtypes: ['double', 'long'],
          units: ['byte'],
          dimensions: ['host.name', 'pod.name'],
        },
      ],
      allDimensionFields: ['host.name', 'pod.name'],
    });
  });

  it('returns allDimensionFields as union of all dimension_fields across rows with no duplicates', () => {
    const response: ESQLSearchResponse = {
      columns: METRICS_INFO_COLUMNS,
      values: [
        ['metric.a', 'ds-1', 'percent', 'gauge', 'double', ['host.name', 'pod.name']],
        ['metric.b', 'ds-2', 'byte', 'counter', 'long', ['host.name', 'container.id']],
        ['metric.b', 'ds-2', 'byte', 'counter', 'long', []],
      ],
    };
    const result = parseMetricsInfoResponse(response);
    expect(result.allDimensionFields).toEqual(['host.name', 'pod.name', 'container.id']);
    expect(result.allDimensionFields).toHaveLength(3);
  });
});
