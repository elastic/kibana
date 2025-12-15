/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { useMetricFields } from './use_metric_fields';
import * as metricsExperienceStateProvider from '../context/metrics_experience_state_provider';
import * as metricsExperienceFieldsProvider from '../context/metrics_experience_fields_provider';
import type { MetricField, Dimension } from '../types';

jest.mock('../context/metrics_experience_state_provider');
jest.mock('../context/metrics_experience_fields_provider');

const useMetricsExperienceStateMock =
  metricsExperienceStateProvider.useMetricsExperienceState as jest.MockedFunction<
    typeof metricsExperienceStateProvider.useMetricsExperienceState
  >;

const useMetricsExperienceFieldsContextMock =
  metricsExperienceFieldsProvider.useMetricsExperienceFieldsContext as jest.MockedFunction<
    typeof metricsExperienceFieldsProvider.useMetricsExperienceFieldsContext
  >;

describe('useMetricFields', () => {
  const mockOnDimensionsChange = jest.fn();

  const defaultStateContext = {
    currentPage: 0,
    selectedDimensions: [] as Dimension[],
    onDimensionsChange: mockOnDimensionsChange,
    onPageChange: jest.fn(),
    isFullscreen: false,
    searchTerm: '',
    onSearchTermChange: jest.fn(),
    onToggleFullscreen: jest.fn(),
  };

  const defaultFieldsContext = {
    metricFields: [] as MetricField[],
    dimensions: [] as Dimension[],
    sampleRowByMetric: new Map(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useMetricsExperienceStateMock.mockReturnValue(defaultStateContext);
    useMetricsExperienceFieldsContextMock.mockReturnValue(defaultFieldsContext);
  });

  describe('when there is no data', () => {
    it('returns empty arrays when metricFields is empty', () => {
      const { result } = renderHook(() => useMetricFields());

      expect(result.current.allMetricFields).toEqual([]);
      expect(result.current.visibleMetricFields).toEqual([]);
      expect(result.current.dimensions).toEqual([]);
    });

    it('returns empty arrays when sampleRowByMetric is empty', () => {
      useMetricsExperienceFieldsContextMock.mockReturnValue({
        ...defaultFieldsContext,
        metricFields: [{ name: 'cpu.usage', index: 'metrics-*', type: 'long', dimensions: [] }],
      });

      const { result } = renderHook(() => useMetricFields());

      expect(result.current.allMetricFields).toEqual([]);
      expect(result.current.visibleMetricFields).toEqual([]);
      expect(result.current.dimensions).toEqual([]);
    });
  });

  describe('metric fields', () => {
    const baseDimensions: Dimension[] = [
      { name: 'host.name', type: ES_FIELD_TYPES.KEYWORD },
      { name: 'service.name', type: ES_FIELD_TYPES.KEYWORD },
    ];

    it('adds dimensions from sample rows', () => {
      const sampleRowByMetric = new Map([
        ['cpu.usage', { 'host.name': 'host-1', 'service.name': 'api', 'cpu.usage': 0.75 }],
        ['memory.used', { 'host.name': 'host-1', 'memory.used': 1024 }],
      ]);

      useMetricsExperienceFieldsContextMock.mockReturnValue({
        ...defaultFieldsContext,
        metricFields: [
          { name: 'cpu.usage', index: 'metrics-*', type: 'double', dimensions: [] },
          { name: 'memory.used', index: 'metrics-*', type: 'long', dimensions: [] },
        ],
        dimensions: baseDimensions,
        sampleRowByMetric,
      });

      const { result } = renderHook(() => useMetricFields());

      expect(result.current.allMetricFields).toHaveLength(2);

      const cpuField = result.current.allMetricFields.find((f) => f.name === 'cpu.usage');
      expect(cpuField?.dimensions).toEqual([
        { name: 'host.name', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'service.name', type: ES_FIELD_TYPES.KEYWORD },
      ]);

      const memoryField = result.current.allMetricFields.find((f) => f.name === 'memory.used');
      expect(memoryField?.dimensions).toEqual([
        { name: 'host.name', type: ES_FIELD_TYPES.KEYWORD },
      ]);
    });

    it('adds normalized units from sample rows', () => {
      const sampleRowByMetric = new Map([
        ['cpu.usage', { 'cpu.usage': 0.75, unit: '%' }],
        ['latency', { latency: 1500, unit: 'ms' }],
      ]);

      useMetricsExperienceFieldsContextMock.mockReturnValue({
        ...defaultFieldsContext,
        metricFields: [
          { name: 'cpu.usage', index: 'metrics-*', type: 'double', dimensions: [] },
          { name: 'latency', index: 'metrics-*', type: 'long', dimensions: [] },
        ],
        dimensions: [],
        sampleRowByMetric,
      });

      const { result } = renderHook(() => useMetricFields());

      expect(result.current.allMetricFields).toHaveLength(2);

      const cpuField = result.current.allMetricFields.find((f) => f.name === 'cpu.usage');
      expect(cpuField?.unit).toBe('percent');

      const latencyField = result.current.allMetricFields.find((f) => f.name === 'latency');
      expect(latencyField?.unit).toBe('ms');
    });

    it('excludes dimensions without values', () => {
      const sampleRowByMetric = new Map([
        ['cpu.usage', { 'host.name': 'host-1', 'service.name': null, 'cpu.usage': 0.75 }],
      ]);

      useMetricsExperienceFieldsContextMock.mockReturnValue({
        ...defaultFieldsContext,
        metricFields: [{ name: 'cpu.usage', index: 'metrics-*', type: 'double', dimensions: [] }],
        dimensions: baseDimensions,
        sampleRowByMetric,
      });

      const { result } = renderHook(() => useMetricFields());

      const cpuField = result.current.allMetricFields[0];
      expect(cpuField?.dimensions).toEqual([{ name: 'host.name', type: ES_FIELD_TYPES.KEYWORD }]);
    });

    it('sorts fields alphabetically by name', () => {
      const sampleRowByMetric = new Map([
        ['zebra.metric', { 'zebra.metric': 1 }],
        ['alpha.metric', { 'alpha.metric': 2 }],
        ['middle.metric', { 'middle.metric': 3 }],
      ]);

      useMetricsExperienceFieldsContextMock.mockReturnValue({
        ...defaultFieldsContext,
        metricFields: [
          { name: 'zebra.metric', index: 'metrics-*', type: 'long', dimensions: [] },
          { name: 'alpha.metric', index: 'metrics-*', type: 'long', dimensions: [] },
          { name: 'middle.metric', index: 'metrics-*', type: 'long', dimensions: [] },
        ],
        sampleRowByMetric,
      });

      const { result } = renderHook(() => useMetricFields());

      expect(result.current.allMetricFields.map((f) => f.name)).toEqual([
        'alpha.metric',
        'middle.metric',
        'zebra.metric',
      ]);
    });
  });

  describe('dimensions', () => {
    it('extracts unique dimensions from sampled metric fields', () => {
      const dimensions: Dimension[] = [
        { name: 'host.name', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'service.name', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'region', type: ES_FIELD_TYPES.KEYWORD },
      ];

      const sampleRowByMetric = new Map([
        [
          'system.cpu.utilization',
          { 'host.name': 'host-1', 'service.name': 'api', 'cpu.usage': 0.75 },
        ],
        [
          'system.memory.utilization',
          { 'host.name': 'host-2', region: 'us-east', 'memory.used': 1024 },
        ],
      ]);

      useMetricsExperienceFieldsContextMock.mockReturnValue({
        ...defaultFieldsContext,
        metricFields: [
          { name: 'system.cpu.utilization', index: 'metrics-*', type: 'double', dimensions: [] },
          { name: 'system.memory.utilization', index: 'metrics-*', type: 'long', dimensions: [] },
        ],
        dimensions,
        sampleRowByMetric,
      });

      const { result } = renderHook(() => useMetricFields());

      // host.name appears in both fields but should only be included once
      expect(result.current.dimensions).toHaveLength(3);
      expect(result.current.dimensions.map((d) => d.name)).toEqual([
        'host.name',
        'region',
        'service.name',
      ]);
    });

    it('sorts dimensions alphabetically', () => {
      const dimensions: Dimension[] = [
        { name: 'Zebra', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'alpha', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'Middle', type: ES_FIELD_TYPES.KEYWORD },
      ];

      const sampleRowByMetric = new Map([
        ['metric1', { Zebra: 'z', alpha: 'a', Middle: 'm', metric1: 1 }],
      ]);

      useMetricsExperienceFieldsContextMock.mockReturnValue({
        ...defaultFieldsContext,
        metricFields: [{ name: 'metric1', index: 'metrics-*', type: 'long', dimensions: [] }],
        dimensions,
        sampleRowByMetric,
      });

      const { result } = renderHook(() => useMetricFields());

      expect(result.current.dimensions.map((d) => d.name)).toEqual(['alpha', 'Middle', 'Zebra']);
    });

    it('removes invalid dimensions from selection when context data changes', async () => {
      const dimensions: Dimension[] = [{ name: 'host.name', type: ES_FIELD_TYPES.KEYWORD }];

      const sampleRowByMetric = new Map([
        ['system.cpu.utilization', { 'host.name': 'host-1', 'system.cpu.utilization': 0.75 }],
      ]);

      useMetricsExperienceFieldsContextMock.mockReturnValue({
        ...defaultFieldsContext,
        metricFields: [
          { name: 'system.cpu.utilization', index: 'metrics-*', type: 'double', dimensions: [] },
        ],
        dimensions,
        sampleRowByMetric,
      });

      // User has selected a dimension that no longer exists in sampledDimensions
      useMetricsExperienceStateMock.mockReturnValue({
        ...defaultStateContext,
        selectedDimensions: [
          { name: 'host.name', type: ES_FIELD_TYPES.KEYWORD },
          { name: 'removed.dimension', type: ES_FIELD_TYPES.KEYWORD },
        ],
      });

      renderHook(() => useMetricFields());

      // Should keep only the valid dimension (host.name)
      await waitFor(() =>
        expect(mockOnDimensionsChange).toHaveBeenCalledWith([
          { name: 'host.name', type: ES_FIELD_TYPES.KEYWORD },
        ])
      );
    });
  });
});
