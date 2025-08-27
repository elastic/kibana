/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useChartLayers } from './use_chart_layers';
import * as esqlModule from '@kbn/esql-editor';
import * as esqlHook from '../../../hooks';
import type { ChartSectionProps, UnifiedHistogramServices } from '@kbn/unified-histogram/types';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import type { TimeRange } from '@kbn/data-plugin/common';

jest.mock('@kbn/esql-editor', () => ({
  fetchFieldsFromESQL: jest.fn(),
}));
jest.mock('../../../hooks', () => ({
  useEsqlQueryInfo: jest.fn(),
}));

const fetchFieldsFromESQLMock = esqlModule.fetchFieldsFromESQL as jest.MockedFunction<
  typeof esqlModule.fetchFieldsFromESQL
>;
const useEsqlQueryInfoMock = esqlHook.useEsqlQueryInfo as jest.MockedFunction<
  typeof esqlHook.useEsqlQueryInfo
>;

const servicesMock: Partial<UnifiedHistogramServices> = {
  expressions: expressionsPluginMock.createStartContract(),
};

describe('useChartLayers', () => {
  const mockServices: Pick<ChartSectionProps, 'services'> = {
    services: servicesMock as UnifiedHistogramServices,
  };

  const timeRange: TimeRange = { from: 'now-1h', to: 'now' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty yAxis if no columns', async () => {
    fetchFieldsFromESQLMock.mockResolvedValue(
      Promise.resolve({
        columns: [],
        rows: [],
        type: 'datatable',
      })
    );
    useEsqlQueryInfoMock.mockReturnValue({
      dimensions: [],
      columns: [],
      metricField: '',
      indices: [],
    });

    const { result } = renderHook(() =>
      useChartLayers({
        query: 'FROM metrics-*',
        timeRange,
        seriesType: 'line',
        color: 'red',
        services: mockServices.services,
      })
    );

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
    });

    const layer = result.current[0];
    expect(layer.xAxis).toBe('@timestamp');
    expect(layer.yAxis).toEqual([]);
    expect(layer.seriesType).toBe('line');
    expect(layer.breakdown).toBeUndefined();
  });

  it('maps columns correctly to yAxis and uses dimensions for breakdown', async () => {
    fetchFieldsFromESQLMock.mockResolvedValue(
      Promise.resolve({
        columns: [
          { name: '@timestamp', meta: { type: 'date' }, id: '@timestamp' },
          { name: 'value', meta: { type: 'number' }, id: 'value' },
          { name: 'dimension', meta: { type: 'number' }, id: 'dimension' },
        ],
        rows: [],
        type: 'datatable',
      })
    );
    useEsqlQueryInfoMock.mockReturnValue({
      dimensions: ['dimension'],
      columns: [],
      metricField: '',
      indices: [],
    });

    const { result } = renderHook(() =>
      useChartLayers({
        query: 'FROM metrics-*',
        timeRange,
        seriesType: 'area',
        color: 'blue',
        services: mockServices.services,
      })
    );

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
    });

    const layer = result.current[0];
    expect(layer.xAxis).toBe('@timestamp');
    expect(layer.yAxis).toHaveLength(1);
    expect(layer.yAxis[0].label).toBe('value');
    expect(layer.yAxis[0].seriesColor).toBe('blue');
    expect(layer.seriesType).toBe('area');
    expect(layer.breakdown).toBe('dimensions');
  });

  it('uses first date column as xAxis', async () => {
    fetchFieldsFromESQLMock.mockResolvedValue(
      Promise.resolve({
        columns: [
          { name: 'timestamp_field', meta: { type: 'date' }, id: 'timestamp_field' },
          { name: 'metric', meta: { type: 'number' }, id: 'metric' },
        ],
        rows: [],
        type: 'datatable',
      })
    );
    useEsqlQueryInfoMock.mockReturnValue({
      dimensions: [],
      columns: [],
      metricField: '',
      indices: [],
    });

    const { result } = renderHook(() =>
      useChartLayers({
        query: 'FROM metrics-*',
        timeRange,
        seriesType: 'bar',
        services: mockServices.services,
      })
    );

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
    });

    expect(result.current[0].xAxis).toBe('timestamp_field');
  });
});
