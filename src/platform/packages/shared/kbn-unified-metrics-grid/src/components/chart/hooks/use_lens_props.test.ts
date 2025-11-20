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
import { BehaviorSubject } from 'rxjs';
import { useLensProps } from './use_lens_props';
import { useChartLayers } from './use_chart_layers';
import type { LensSeriesLayer } from '@kbn/lens-embeddable-utils/config_builder';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { UnifiedHistogramServices } from '@kbn/unified-histogram';
import type { UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import type { TimeRange } from '@kbn/data-plugin/common';

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
  let discoverFetch$: BehaviorSubject<UnifiedHistogramInputMessage>;
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

    // Create a fresh Subject for each test to prevent memory leaks
    discoverFetch$ = new BehaviorSubject({ type: 'fetch' });

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
        getTimeRange,
        discoverFetch$,
        chartRef,
        chartLayers: mockChartLayers,
      })
    );

    expect(result.current).toBeUndefined();

    // Trigger a fetch to load attributes
    act(() => {
      discoverFetch$.next({ type: 'fetch' });
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
        getTimeRange,
        discoverFetch$,
        chartRef,
        chartLayers: mockChartLayers,
      })
    );

    // Trigger a fetch to call build
    act(() => {
      discoverFetch$.next({ type: 'fetch' });
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
    const { result } = renderHook(() =>
      useLensProps({
        title: 'Test Chart',
        query: 'FROM metrics-*',
        services: servicesMock as UnifiedHistogramServices,
        getTimeRange,
        discoverFetch$,
        chartRef,
        chartLayers: mockChartLayers,
      })
    );

    act(() => {
      discoverFetch$.next({ type: 'fetch' });
    });

    await waitFor(() => {
      expect(result.current).toStrictEqual({
        attributes: { attributes: {}, state: {}, visualizationType: 'lnsXY' },
        executionContext: { description: 'metrics experience chart data' },
        id: 'metricsExperienceLensComponent',
        noPadding: true,
        searchSessionId: undefined,
        timeRange: getTimeRange(),
        viewMode: 'view',
      });
    });
  });

  it('handles chartRef as null gracefully', async () => {
    const { result } = renderHook(() =>
      useLensProps({
        title: 'Test Chart',
        query: 'FROM metrics-*',
        services: servicesMock as UnifiedHistogramServices,
        getTimeRange,
        discoverFetch$,
        chartRef: undefined,
        chartLayers: mockChartLayers,
      })
    );

    // Trigger a fetch
    act(() => {
      discoverFetch$.next({ type: 'fetch' });
    });

    await waitFor(() => {
      expect(result.current).not.toBeUndefined();
    });
  });
});
