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
import type { MetricField, Dimension } from '../../../../types';

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
    getSampleRow: jest.fn(() => undefined),
    whereStatements: [] as string[],
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
        metricFields: [
          { name: 'cpu.usage', index: 'metrics-*', type: ES_FIELD_TYPES.LONG, dimensions: [] },
        ],
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
      const sampleRows = new Map([
        ['cpu.usage', { 'host.name': 'host-1', 'service.name': 'api', 'cpu.usage': 0.75 }],
        ['memory.used', { 'host.name': 'host-1', 'memory.used': 1024 }],
      ]);

      useMetricsExperienceFieldsContextMock.mockReturnValue({
        ...defaultFieldsContext,
        metricFields: [
          { name: 'cpu.usage', index: 'metrics-*', type: ES_FIELD_TYPES.DOUBLE, dimensions: [] },
          { name: 'memory.used', index: 'metrics-*', type: ES_FIELD_TYPES.LONG, dimensions: [] },
        ],
        dimensions: baseDimensions,
        getSampleRow: (name: string) => sampleRows.get(name),
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
      const sampleRows = new Map([
        ['cpu.usage', { 'cpu.usage': 0.75, unit: '%' }],
        ['latency', { latency: 1500, unit: 'ms' }],
      ]);

      useMetricsExperienceFieldsContextMock.mockReturnValue({
        ...defaultFieldsContext,
        metricFields: [
          { name: 'cpu.usage', index: 'metrics-*', type: ES_FIELD_TYPES.DOUBLE, dimensions: [] },
          { name: 'latency', index: 'metrics-*', type: ES_FIELD_TYPES.LONG, dimensions: [] },
        ],
        dimensions: [],
        getSampleRow: (name: string) => sampleRows.get(name),
      });

      const { result } = renderHook(() => useMetricFields());

      expect(result.current.allMetricFields).toHaveLength(2);

      const cpuField = result.current.allMetricFields.find((f) => f.name === 'cpu.usage');
      expect(cpuField?.unit).toBe('percent');

      const latencyField = result.current.allMetricFields.find((f) => f.name === 'latency');
      expect(latencyField?.unit).toBe('ms');
    });

    it('excludes dimensions without values', () => {
      const sampleRows = new Map([
        ['cpu.usage', { 'host.name': 'host-1', 'service.name': null, 'cpu.usage': 0.75 }],
      ]);

      useMetricsExperienceFieldsContextMock.mockReturnValue({
        ...defaultFieldsContext,
        metricFields: [
          { name: 'cpu.usage', index: 'metrics-*', type: ES_FIELD_TYPES.DOUBLE, dimensions: [] },
        ],
        dimensions: baseDimensions,
        getSampleRow: (name: string) => sampleRows.get(name),
      });

      const { result } = renderHook(() => useMetricFields());

      const cpuField = result.current.allMetricFields[0];
      expect(cpuField?.dimensions).toEqual([{ name: 'host.name', type: ES_FIELD_TYPES.KEYWORD }]);
    });

    it('filters out legacy histogram metric types', () => {
      const sampleRows = new Map([
        ['cpu.usage', { 'cpu.usage': 0.75 }],
        ['http.request.duration', { 'http.request.duration': 150 }],
        ['memory.used', { 'memory.used': 1024 }],
      ]);

      useMetricsExperienceFieldsContextMock.mockReturnValue({
        ...defaultFieldsContext,
        metricFields: [
          { name: 'cpu.usage', index: 'metrics-*', type: ES_FIELD_TYPES.DOUBLE, dimensions: [] },
          {
            name: 'http.request.duration',
            index: 'metrics-*',
            type: ES_FIELD_TYPES.HISTOGRAM,
            dimensions: [],
          },
          { name: 'memory.used', index: 'metrics-*', type: ES_FIELD_TYPES.LONG, dimensions: [] },
        ],
        dimensions: [],
        getSampleRow: (name: string) => sampleRows.get(name),
      });

      const { result } = renderHook(() => useMetricFields());

      expect(result.current.allMetricFields).toHaveLength(2);
      expect(
        result.current.allMetricFields.find((f) => f.name === 'http.request.duration')
      ).toBeUndefined();
      expect(result.current.allMetricFields.find((f) => f.name === 'cpu.usage')).toBeDefined();
      expect(result.current.allMetricFields.find((f) => f.name === 'memory.used')).toBeDefined();
    });
  });

  describe('dimensions', () => {
    it('returns dimensions from context', () => {
      const dimensions: Dimension[] = [
        { name: 'host.name', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'service.name', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'region', type: ES_FIELD_TYPES.KEYWORD },
      ];

      const sampleRows = new Map([
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
          {
            name: 'system.cpu.utilization',
            index: 'metrics-*',
            type: ES_FIELD_TYPES.DOUBLE,
            dimensions: [],
          },
          {
            name: 'system.memory.utilization',
            index: 'metrics-*',
            type: ES_FIELD_TYPES.LONG,
            dimensions: [],
          },
        ],
        dimensions,
        getSampleRow: (name: string) => sampleRows.get(name),
      });

      const { result } = renderHook(() => useMetricFields());

      // dimensions come directly from context
      expect(result.current.dimensions).toHaveLength(3);
      expect(result.current.dimensions).toEqual(dimensions);
    });

    it('removes invalid dimensions from selection when context data changes', async () => {
      const dimensions: Dimension[] = [{ name: 'host.name', type: ES_FIELD_TYPES.KEYWORD }];

      const sampleRows = new Map([
        ['system.cpu.utilization', { 'host.name': 'host-1', 'system.cpu.utilization': 0.75 }],
      ]);

      useMetricsExperienceFieldsContextMock.mockReturnValue({
        ...defaultFieldsContext,
        metricFields: [
          {
            name: 'system.cpu.utilization',
            index: 'metrics-*',
            type: ES_FIELD_TYPES.DOUBLE,
            dimensions: [],
          },
        ],
        dimensions,
        getSampleRow: (name: string) => sampleRows.get(name),
      });

      // User has selected a dimension that no longer exists in context dimensions
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
