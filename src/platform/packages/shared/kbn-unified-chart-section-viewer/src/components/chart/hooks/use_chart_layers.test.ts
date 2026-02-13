/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { MetricField } from '../../../types';
import { useChartLayers } from './use_chart_layers';
import { ES_FIELD_TYPES } from '@kbn/field-types';

jest.mock('../../../common/utils', () => ({
  ...jest.requireActual('../../../common/utils'),
  createMetricAggregation: jest.fn(({ metricName }) => `AVG(${metricName})`),
  createTimeBucketAggregation: jest.fn(() => 'time_bucket_agg'),
}));

describe('useChartLayers', () => {
  const mockMetric: MetricField = {
    name: 'system.cpu.total.norm.pct',
    type: ES_FIELD_TYPES.DOUBLE,
    instrument: 'gauge',
    unit: 'percent',
    index: 'metrics-*',
    dimensions: [],
  };

  it('should return an area chart configuration when no dimensions are provided', () => {
    const { result } = renderHook(() =>
      useChartLayers({
        metric: mockMetric,
        dimensions: [],
        color: '#000',
      })
    );

    const [layer] = result.current;
    expect(layer.seriesType).toBe('area');
    expect(layer.breakdown).toBeUndefined();
    expect(layer.yAxis[0].value).toBe('AVG(system.cpu.total.norm.pct)');
    expect(layer.yAxis[0].seriesColor).toBe('#000');
  });

  it('should return a line chart configuration with a breakdown when single dimension is provided', () => {
    const { result } = renderHook(() =>
      useChartLayers({
        metric: mockMetric,
        dimensions: [{ name: 'service.name', type: ES_FIELD_TYPES.KEYWORD }],
        color: '#FFF',
      })
    );

    const [layer] = result.current;
    expect(layer.seriesType).toBe('line');
    expect(layer.breakdown).toBe('service.name'); // Single dimension as string
    expect(layer.yAxis[0].value).toBe('AVG(system.cpu.total.norm.pct)');
    expect(layer.yAxis[0].seriesColor).toBe('#FFF');
  });

  it('should return a line chart configuration with first dimension when multiple dimensions are provided', () => {
    const { result } = renderHook(() =>
      useChartLayers({
        metric: mockMetric,
        dimensions: [
          { name: 'service.name', type: ES_FIELD_TYPES.KEYWORD },
          { name: 'host.name', type: ES_FIELD_TYPES.KEYWORD },
        ],
        color: '#FFF',
      })
    );

    const [layer] = result.current;
    expect(layer.seriesType).toBe('line');
    // Lens uses first dimension only after revert
    expect(layer.breakdown).toBe('service.name');
    expect(layer.yAxis[0].value).toBe('AVG(system.cpu.total.norm.pct)');
    expect(layer.yAxis[0].seriesColor).toBe('#FFF');
  });

  it('should include format options if the metric has a unit', () => {
    const metricWithUnit: MetricField = { ...mockMetric, unit: 'bytes' };
    const { result } = renderHook(() =>
      useChartLayers({
        metric: metricWithUnit,
        dimensions: [],
      })
    );
    const [layer] = result.current;
    expect(layer.yAxis[0]).toHaveProperty('format');
    expect(layer.yAxis[0]).toHaveProperty('format');
  });

  it('should not include format options if the metric has no unit', () => {
    const metricWithoutUnit: MetricField = { ...mockMetric, unit: undefined };
    const { result } = renderHook(() =>
      useChartLayers({
        metric: metricWithoutUnit,
        dimensions: [],
      })
    );
    const [layer] = result.current;
    expect(layer.yAxis[0]).not.toHaveProperty('format');
    expect(layer.yAxis[0]).not.toHaveProperty('formatString');
  });
});
