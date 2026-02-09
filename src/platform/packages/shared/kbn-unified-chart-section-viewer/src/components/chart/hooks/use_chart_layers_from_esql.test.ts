/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useChartLayersFromEsql } from './use_chart_layers_from_esql';
import * as esqlModule from '@kbn/esql-utils';
import * as esqlHook from '../../../hooks';
import type { UnifiedHistogramServices } from '@kbn/unified-histogram/types';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { TimeRange } from '@kbn/data-plugin/common';
import type { UnifiedMetricsGridProps } from '../../../types';

jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getESQLQueryColumns: jest.fn(),
}));
jest.mock('../../../hooks', () => ({
  useEsqlQueryInfo: jest.fn(),
}));

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const getESQLQueryColumnsMock = esqlModule.getESQLQueryColumns as jest.MockedFunction<
  typeof esqlModule.getESQLQueryColumns
>;
const useEsqlQueryInfoMock = esqlHook.useEsqlQueryInfo as jest.MockedFunction<
  typeof esqlHook.useEsqlQueryInfo
>;

const servicesMock: Partial<UnifiedHistogramServices> = {
  data: dataPluginMock.createStartContract(),
};

describe('useChartLayers', () => {
  const mockServices: Pick<UnifiedMetricsGridProps, 'services'> = {
    services: servicesMock as UnifiedHistogramServices,
  };

  const timeRange: TimeRange = { from: 'now-1h', to: 'now' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty yAxis if no columns', async () => {
    getESQLQueryColumnsMock.mockResolvedValue([]);

    useEsqlQueryInfoMock.mockReturnValue({
      dimensions: [],
      columns: [],
      metricField: '',
      indices: [],
      filters: [],
    });

    const { result } = renderHook(() =>
      useChartLayersFromEsql({
        query: 'FROM metrics-*',
        timeRange,
        seriesType: 'line',
        color: 'red',
        services: mockServices.services,
      })
    );

    await waitFor(() => {
      expect(result.current.layers).toHaveLength(0);
    });
  });

  it('maps columns correctly to yAxis and uses single dimension name for breakdown', async () => {
    getESQLQueryColumnsMock.mockResolvedValue([
      { name: '@timestamp', meta: { type: 'date' }, id: '@timestamp' },
      { name: 'value', meta: { type: 'number' }, id: 'value' },
      { name: 'service.name', meta: { type: 'string' }, id: 'service.name' },
    ]);

    useEsqlQueryInfoMock.mockReturnValue({
      dimensions: ['service.name'],
      columns: [],
      metricField: '',
      indices: [],
      filters: [],
    });

    const { result } = renderHook(() =>
      useChartLayersFromEsql({
        query: 'FROM metrics-*',
        timeRange,
        seriesType: 'area',
        color: 'blue',
        services: mockServices.services,
      })
    );

    await waitFor(() => {
      expect(result.current.layers).toHaveLength(1);
    });

    const layer = result.current.layers[0];
    expect(layer.xAxis).toStrictEqual({ field: '@timestamp', type: 'dateHistogram' });
    expect(layer.yAxis).toHaveLength(1);
    expect(layer.yAxis[0].label).toBe('value');
    expect(layer.yAxis[0].seriesColor).toBe('blue');
    expect(layer.seriesType).toBe('area');
    expect(layer.breakdown).toBe('service.name'); // Single dimension uses actual dimension name
  });

  it('maps columns correctly to yAxis and uses first dimension for multiple dimensions', async () => {
    getESQLQueryColumnsMock.mockResolvedValue([
      { name: '@timestamp', meta: { type: 'date' }, id: '@timestamp' },
      { name: 'value', meta: { type: 'number' }, id: 'value' },
      { name: 'service.name', meta: { type: 'string' }, id: 'service.name' },
      { name: 'host.name', meta: { type: 'string' }, id: 'host.name' },
    ]);

    useEsqlQueryInfoMock.mockReturnValue({
      dimensions: ['service.name', 'host.name'],
      columns: [],
      metricField: '',
      indices: [],
      filters: [],
    });

    const { result } = renderHook(() =>
      useChartLayersFromEsql({
        query: 'FROM metrics-*',
        timeRange,
        seriesType: 'area',
        color: 'blue',
        services: mockServices.services,
      })
    );

    await waitFor(() => {
      expect(result.current.layers).toHaveLength(1);
    });

    const layer = result.current.layers[0];
    expect(layer.xAxis).toStrictEqual({ field: '@timestamp', type: 'dateHistogram' });
    expect(layer.yAxis).toHaveLength(1);
    expect(layer.yAxis[0].label).toBe('value');
    expect(layer.yAxis[0].seriesColor).toBe('blue');
    expect(layer.seriesType).toBe('area');
    // Lens natively supports multiple dimensions - pass first dimension as breakdown
    expect(layer.breakdown).toBe('service.name');
  });

  it('uses first date column as xAxis', async () => {
    getESQLQueryColumnsMock.mockResolvedValue([
      { name: 'timestamp_field', meta: { type: 'date' }, id: 'timestamp_field' },
      { name: 'metric', meta: { type: 'number' }, id: 'metric' },
    ]);

    useEsqlQueryInfoMock.mockReturnValue({
      dimensions: [],
      columns: [],
      metricField: '',
      indices: [],
      filters: [],
    });

    const { result } = renderHook(() =>
      useChartLayersFromEsql({
        query: 'FROM metrics-*',
        timeRange,
        seriesType: 'bar',
        services: mockServices.services,
      })
    );

    await waitFor(() => {
      expect(result.current.layers).toHaveLength(1);
    });

    expect(result.current.layers[0].xAxis).toStrictEqual({
      field: 'timestamp_field',
      type: 'dateHistogram',
    });
  });

  it('sets loading to true while columns request is pending', async () => {
    const deferred = createDeferred<any[]>();

    getESQLQueryColumnsMock.mockReturnValue(deferred.promise as any);

    useEsqlQueryInfoMock.mockReturnValue({
      dimensions: [],
      columns: [],
      metricField: '',
      indices: [],
      filters: [],
    });

    const { result } = renderHook(() =>
      useChartLayersFromEsql({
        query: 'FROM metrics-*',
        timeRange,
        seriesType: 'line',
        services: mockServices.services,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    expect(result.current.layers).toEqual([]);
    expect(result.current.error).toBeUndefined();

    await act(async () => {
      deferred.resolve([]);
      await deferred.promise;
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('exposes error when columns request fails', async () => {
    const columnsError = new Error('Columns request failed');

    getESQLQueryColumnsMock.mockRejectedValue(columnsError);

    useEsqlQueryInfoMock.mockReturnValue({
      dimensions: [],
      columns: [],
      metricField: '',
      indices: [],
      filters: [],
    });

    const { result } = renderHook(() =>
      useChartLayersFromEsql({
        query: 'FROM metrics-*',
        timeRange,
        seriesType: 'line',
        services: mockServices.services,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(columnsError);
    });

    expect(result.current.layers).toEqual([]);
  });
});
