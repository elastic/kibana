/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { ParsedMetricItem, MetricUnit } from '../../../types';
import { useChartLayers } from './use_chart_layers';
import { ES_FIELD_TYPES } from '@kbn/field-types';

jest.mock('../../../common/utils', () => ({
  ...jest.requireActual('../../../common/utils'),
  createMetricAggregation: jest.fn(({ metricName }) => `AVG(${metricName})`),
  createTimeBucketAggregation: jest.fn(() => 'time_bucket_agg'),
}));

describe('useChartLayers', () => {
  const mockMetric: ParsedMetricItem = {
    metricName: 'system.cpu.total.norm.pct',
    dataStream: 'metrics-*',
    fieldTypes: [ES_FIELD_TYPES.DOUBLE],
    metricTypes: ['gauge'],
    units: ['percent'],
    dimensionFields: [],
  };

  it('should return an area chart configuration when no dimensions are provided', () => {
    const { result } = renderHook(() =>
      useChartLayers({
        metricItem: mockMetric,
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
        metricItem: mockMetric,
        dimensions: [{ name: 'service.name' }],
        color: '#FFF',
      })
    );

    const [layer] = result.current;
    expect(layer.seriesType).toBe('line');
    expect(layer.breakdown).toEqual(['service.name']); // Single dimension as array
    expect(layer.yAxis[0].value).toBe('AVG(system.cpu.total.norm.pct)');
    expect(layer.yAxis[0].seriesColor).toBe('#FFF');
  });

  it('should return a line chart configuration with array when multiple dimensions are provided', () => {
    const { result } = renderHook(() =>
      useChartLayers({
        metricItem: mockMetric,
        dimensions: [{ name: 'service.name' }, { name: 'host.name' }],
        color: '#FFF',
      })
    );

    const [layer] = result.current;
    expect(layer.seriesType).toBe('line');
    // Lens natively supports multiple dimensions - pass all dimensions as array
    expect(layer.breakdown).toEqual(['service.name', 'host.name']);
    expect(layer.yAxis[0].value).toBe('AVG(system.cpu.total.norm.pct)');
    expect(layer.yAxis[0].seriesColor).toBe('#FFF');
  });

  it('should include format options if the metric has a unit', () => {
    const metricWithUnit: ParsedMetricItem = { ...mockMetric, units: ['bytes'] as MetricUnit[] };
    const { result } = renderHook(() =>
      useChartLayers({
        metricItem: metricWithUnit,
        dimensions: [],
      })
    );
    const [layer] = result.current;
    expect(layer.yAxis[0]).toHaveProperty('format');
    expect(layer.yAxis[0]).toHaveProperty('format');
  });

  it('should not include format options if the metric has no unit', () => {
    const metricWithoutUnit: ParsedMetricItem = { ...mockMetric, units: [] as MetricUnit[] };
    const { result } = renderHook(() =>
      useChartLayers({
        metricItem: metricWithoutUnit,
        dimensions: [],
      })
    );
    const [layer] = result.current;
    expect(layer.yAxis[0]).not.toHaveProperty('format');
    expect(layer.yAxis[0]).not.toHaveProperty('formatString');
  });

  describe('when type or instrument is null or undefined', () => {
    it('should return empty layers when fieldTypes is empty', () => {
      const metricNoType: ParsedMetricItem = { ...mockMetric, fieldTypes: [] };
      const { result } = renderHook(() =>
        useChartLayers({
          metricItem: metricNoType,
          dimensions: [],
        })
      );
      expect(result.current).toEqual([]);
    });

    it('should return empty layers when metricTypes is empty', () => {
      const metricNoInstrument: ParsedMetricItem = { ...mockMetric, metricTypes: [] };
      const { result } = renderHook(() =>
        useChartLayers({
          metricItem: metricNoInstrument,
          dimensions: [],
        })
      );
      expect(result.current).toEqual([]);
    });
  });
});
