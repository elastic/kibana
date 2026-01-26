/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { useLensProps } from './use_lens_props';
import { useChartLayers } from './use_chart_layers';
import type { LensSeriesLayer } from '@kbn/lens-embeddable-utils/config_builder';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { UnifiedHistogramServices } from '@kbn/unified-histogram';
import { getFetchParamsMock, getFetch$Mock } from '@kbn/unified-histogram/__mocks__/fetch_params';
import type { TimeRange } from '@kbn/data-plugin/common';
import type { UnifiedHistogramFetch$ } from '@kbn/unified-histogram/types';

jest.mock('./use_chart_layers');
jest.mock('@kbn/lens-embeddable-utils/config_builder');

const LensConfigBuilderMock = LensConfigBuilder as jest.MockedClass<typeof LensConfigBuilder>;
const useChartLayersMock = useChartLayers as jest.MockedFunction<typeof useChartLayers>;
const servicesMock: Partial<UnifiedHistogramServices> = {
  dataViews: dataViewPluginMocks.createStartContract(),
};

describe('useLensProps', () => {
  const mockChartLayers: Array<LensSeriesLayer> = [
    {
      type: 'series',
      seriesType: 'line',
      xAxis: { field: '@timestamp', type: 'dateHistogram', colorPalette: 'foo' },
      yAxis: [{ value: 'foo' }],
    },
  ];

  const mockEmptyChartLayers: Array<LensSeriesLayer> = [];
  const mockError = new Error('Test error');

  const fetchParams = getFetchParamsMock();
  let discoverFetch$: UnifiedHistogramFetch$;
  const getTimeRange = (): TimeRange => ({ from: 'now-1h', to: 'now' });

  const createMockChartRef = () => {
    return React.createRef<HTMLDivElement>();
  };

  const createIntersectionObserverMock = () => {
    const mockObserve = jest.fn();
    const mockDisconnect = jest.fn();
    const mockUnobserve = jest.fn();

    const MockIntersectionObserver = jest.fn().mockImplementation(() => ({
      observe: mockObserve,
      disconnect: mockDisconnect,
      unobserve: mockUnobserve,
      root: null,
      rootMargin: '0px',
      thresholds: [0],
      takeRecords: jest.fn(() => []),
    }));

    return {
      MockIntersectionObserver,
      mockObserve,
      mockDisconnect,
      mockUnobserve,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    discoverFetch$ = getFetch$Mock();

    const { MockIntersectionObserver } = createIntersectionObserverMock();

    Object.assign(window, {
      IntersectionObserver: MockIntersectionObserver,
    });

    LensConfigBuilderMock.prototype.build.mockImplementation(() =>
      Promise.resolve({
        attributes: {} as any,
        state: {} as any,
        visualizationType: 'lnsXY',
      })
    );
    useChartLayersMock.mockReturnValue(mockChartLayers);
  });

  afterEach(() => {
    // Complete the Subject to prevent memory leaks
    discoverFetch$.complete();
  });

  it('returns undefined initially before Lens attributes are built', async () => {
    const chartRef = createMockChartRef();

    const { result } = renderHook(() =>
      useLensProps({
        title: 'Test Chart',
        query: 'FROM metrics-*',
        services: servicesMock as UnifiedHistogramServices,
        fetchParams,
        discoverFetch$,
        chartRef,
        chartLayers: mockChartLayers,
      })
    );

    expect(result.current).toBeUndefined();

    // Trigger a fetch to load attributes
    act(() => {
      discoverFetch$.next({ fetchParams, lensVisServiceState: undefined });
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
      expect(result.current?.attributes).toEqual({
        attributes: {},
        state: {},
        visualizationType: 'lnsXY',
      });
    });
  });

  it('calls LensConfigBuilder.build with correct parameters', async () => {
    const chartRef = createMockChartRef();

    renderHook(() =>
      useLensProps({
        title: 'Test Chart',
        query: 'FROM metrics-*',
        services: servicesMock as UnifiedHistogramServices,
        fetchParams,
        discoverFetch$,
        chartRef,
        chartLayers: mockChartLayers,
      })
    );

    // Trigger a fetch to call build
    act(() => {
      discoverFetch$.next({ fetchParams, lensVisServiceState: undefined });
    });

    await waitFor(() => {
      expect(LensConfigBuilder.prototype.build).toHaveBeenCalledWith(
        {
          chartType: 'xy',
          title: 'Test Chart',
          layers: mockChartLayers,
          axisTitleVisibility: {
            showYRightAxisTitle: false,
            showXAxisTitle: false,
            showYAxisTitle: false,
          },
          dataset: {
            esql: 'FROM metrics-*',
          },
          fittingFunction: 'Linear',
          legend: {
            show: false,
          },
        },
        {
          query: {
            esql: 'FROM metrics-*',
          },
        }
      );
    });
  });

  it('updates lensProps when discoverFetch$ emits', async () => {
    const chartRef = createMockChartRef();
    const testFetchParams = {
      ...fetchParams,
      timeRange: getTimeRange(),
    };
    const { result } = renderHook(() =>
      useLensProps({
        title: 'Test Chart',
        query: 'FROM metrics-*',
        services: servicesMock as UnifiedHistogramServices,
        fetchParams: testFetchParams,
        discoverFetch$,
        chartRef,
        chartLayers: mockChartLayers,
      })
    );
    expect(result.current).toBeUndefined();

    act(() => {
      discoverFetch$.next({ fetchParams: testFetchParams, lensVisServiceState: undefined });
    });

    await waitFor(() => {
      expect(result.current).toStrictEqual(
        expect.objectContaining({
          attributes: { attributes: {}, state: {}, visualizationType: 'lnsXY' },
          executionContext: { description: 'metrics experience chart data' },
          id: 'metricsExperienceLensComponent',
          noPadding: true,
          searchSessionId: fetchParams.searchSessionId,
          timeRange: fetchParams.relativeTimeRange,
          viewMode: 'view',
        })
      );
    });
    expect(result.current?.lastReloadRequestTime).toBeGreaterThan(0);
  });

  it('handles chartRef as null gracefully', async () => {
    const { result } = renderHook(() =>
      useLensProps({
        title: 'Test Chart',
        query: 'FROM metrics-*',
        services: servicesMock as UnifiedHistogramServices,
        fetchParams,
        discoverFetch$,
        chartRef: undefined,
        chartLayers: mockChartLayers,
      })
    );

    expect(result.current).toBeUndefined();

    // Trigger a fetch
    act(() => {
      discoverFetch$.next({ fetchParams, lensVisServiceState: undefined });
    });

    await waitFor(() => {
      expect(result.current).not.toBeUndefined();
    });
  });

  it('does not build Lens attributes when chartLayers is empty', async () => {
    const chartRef = createMockChartRef();

    const { result } = renderHook(() =>
      useLensProps({
        title: 'Test Chart',
        query: 'FROM metrics-*',
        services: servicesMock as UnifiedHistogramServices,
        fetchParams,
        discoverFetch$,
        chartRef,
        chartLayers: mockEmptyChartLayers,
      })
    );

    act(() => {
      discoverFetch$.next({ fetchParams, lensVisServiceState: undefined });
    });

    await waitFor(() => {
      expect(LensConfigBuilder.prototype.build).not.toHaveBeenCalled();
      expect(result.current).toBeUndefined();
    });
  });

  it('builds Lens attributes when forcing Lens to build with no datasource on error', async () => {
    const chartRef = createMockChartRef();

    const { result } = renderHook(() =>
      useLensProps({
        title: 'Test Chart',
        query: 'FROM metrics-*',
        services: servicesMock as UnifiedHistogramServices,
        fetchParams,
        discoverFetch$,
        chartRef,
        chartLayers: mockEmptyChartLayers,
        error: mockError,
      })
    );

    act(() => {
      discoverFetch$.next({ fetchParams, lensVisServiceState: undefined });
    });

    await waitFor(() => {
      expect(LensConfigBuilder.prototype.build).toHaveBeenCalledWith(
        expect.objectContaining({ layers: [] }),
        expect.anything()
      );

      expect(result.current).toBeDefined();
      expect(result.current?.attributes.state).toEqual({});
      expect(result.current?.attributes.state.datasourceStates).toBeUndefined();
    });
  });
});
