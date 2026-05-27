/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { MetricUnit, NullableMetricUnit } from '../../../types';
import { useChartLayers } from './use_chart_layers';
import { ES_FIELD_TYPES } from '@kbn/field-types';

jest.mock('../../../common/utils', () => ({
  ...jest.requireActual('../../../common/utils'),
  createMetricAggregation: jest.fn(({ metricName }) => `AVG(${metricName})`),
  createTimeBucketAggregation: jest.fn(() => 'time_bucket_agg'),
}));

type MetricItemInput = Parameters<typeof useChartLayers>[0]['metricItem'];

describe('useChartLayers', () => {
  const mockMetric: MetricItemInput = {
    metricName: 'system.cpu.total.norm.pct',
    fieldTypes: [ES_FIELD_TYPES.DOUBLE],
    metricTypes: ['gauge'],
    units: ['percent', null],
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
    const metricWithUnit: MetricItemInput = { ...mockMetric, units: ['bytes'] as MetricUnit[] };
    const { result } = renderHook(() =>
      useChartLayers({
        metricItem: metricWithUnit,
        dimensions: [],
      })
    );
    const [layer] = result.current;
    expect(layer.yAxis[0]).toHaveProperty('format');
    expect(layer.yAxis[0].format).toBe('bytes');
  });

  it('should normalize denormalized units like "byte" to "bytes"', () => {
    const metricWithDenormalizedUnit: MetricItemInput = {
      ...mockMetric,
      units: ['byte'] as unknown as NullableMetricUnit[],
    };
    const { result } = renderHook(() =>
      useChartLayers({
        metricItem: metricWithDenormalizedUnit,
        dimensions: [],
      })
    );
    const [layer] = result.current;
    expect(layer.yAxis[0]).toHaveProperty('format');
    expect(layer.yAxis[0].format).toBe('bytes');
  });

  it('should select the first non-null normalized unit when multiple units exist', () => {
    const metricWithMultipleUnits: MetricItemInput = {
      ...mockMetric,
      units: [null, 'byte', 'bytes'] as unknown as NullableMetricUnit[],
    };
    const { result } = renderHook(() =>
      useChartLayers({
        metricItem: metricWithMultipleUnits,
        dimensions: [],
      })
    );
    const [layer] = result.current;
    expect(layer.yAxis[0]).toHaveProperty('format');
    expect(layer.yAxis[0].format).toBe('bytes');
  });

  it('should not include format options if the metric has no unit', () => {
    const metricWithoutUnit: MetricItemInput = { ...mockMetric, units: [] as MetricUnit[] };
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
      const metricNoType: MetricItemInput = { ...mockMetric, fieldTypes: [] };
      const { result } = renderHook(() =>
        useChartLayers({
          metricItem: metricNoType,
          dimensions: [],
        })
      );
      expect(result.current).toEqual([]);
    });

    it('should return empty layers when metricTypes is empty', () => {
      const metricNoInstrument: MetricItemInput = { ...mockMetric, metricTypes: [] };
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
