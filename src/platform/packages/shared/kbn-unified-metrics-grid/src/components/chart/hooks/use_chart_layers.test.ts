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
import * as esqlModule from '@kbn/esql-utils';
import * as esqlHook from '../../../hooks';
import type { ChartSectionProps, UnifiedHistogramServices } from '@kbn/unified-histogram/types';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { TimeRange } from '@kbn/data-plugin/common';
import { DIMENSIONS_COLUMN } from '../../../common/utils';

jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getESQLQueryColumns: jest.fn(),
}));
jest.mock('../../../hooks', () => ({
  useEsqlQueryInfo: jest.fn(),
}));

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
  const mockServices: Pick<ChartSectionProps, 'services'> = {
    services: servicesMock as UnifiedHistogramServices,
  };

  const getTimeRange = (): TimeRange => ({ from: 'now-1h', to: 'now' });

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
    });

    const { result } = renderHook(() =>
      useChartLayers({
        query: 'FROM metrics-*',
        getTimeRange,
        seriesType: 'line',
        color: 'red',
        services: mockServices.services,
      })
    );

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
    });

    const layer = result.current[0];
    expect(layer.xAxis).toStrictEqual({ field: '@timestamp', type: 'dateHistogram' });
    expect(layer.yAxis).toEqual([]);
    expect(layer.seriesType).toBe('line');
    expect(layer.breakdown).toBeUndefined();
  });

  it('maps columns correctly to yAxis and uses dimensions for breakdown', async () => {
    getESQLQueryColumnsMock.mockResolvedValue([
      { name: '@timestamp', meta: { type: 'date' }, id: '@timestamp' },
      { name: 'value', meta: { type: 'number' }, id: 'value' },
      { name: DIMENSIONS_COLUMN, meta: { type: 'number' }, id: DIMENSIONS_COLUMN },
    ]);
    useEsqlQueryInfoMock.mockReturnValue({
      dimensions: [DIMENSIONS_COLUMN],
      columns: [],
      metricField: '',
      indices: [],
    });

    const { result } = renderHook(() =>
      useChartLayers({
        query: 'FROM metrics-*',
        getTimeRange,
        seriesType: 'area',
        color: 'blue',
        services: mockServices.services,
      })
    );

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
    });

    const layer = result.current[0];
    expect(layer.xAxis).toStrictEqual({ field: '@timestamp', type: 'dateHistogram' });
    expect(layer.yAxis).toHaveLength(1);
    expect(layer.yAxis[0].label).toBe('value');
    expect(layer.yAxis[0].seriesColor).toBe('blue');
    expect(layer.seriesType).toBe('area');
    expect(layer.breakdown).toBe(DIMENSIONS_COLUMN);
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
    });

    const { result } = renderHook(() =>
      useChartLayers({
        query: 'FROM metrics-*',
        getTimeRange,
        seriesType: 'bar',
        services: mockServices.services,
      })
    );

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
    });

    expect(result.current[0].xAxis).toStrictEqual({
      field: 'timestamp_field',
      type: 'dateHistogram',
    });
  });
});
