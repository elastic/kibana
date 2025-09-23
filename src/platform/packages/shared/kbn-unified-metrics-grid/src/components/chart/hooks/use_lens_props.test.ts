/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act, waitFor } from '@testing-library/react';
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
  let intersectionCallback: (entries: IntersectionObserverEntry[]) => void;

  const mockChartLayers: Array<LensSeriesLayer> = [
    {
      type: 'series',
      seriesType: 'line',
      xAxis: { field: '@timestamp', type: 'dateHistogram', colorPalette: 'foo' },
      yAxis: [{ value: 'foo' }],
    },
  ];
  const discoverFetch$ = new BehaviorSubject<UnifiedHistogramInputMessage>({ type: 'fetch' });
  const getTimeRange = (): TimeRange => ({ from: 'now-1h', to: 'now' });

  // Create mock chart ref
  const createMockChartRef = () => {
    const div = document.createElement('div');
    return { current: div };
  };

  function mockIntersectionObserver(
    isIntersectingItems?: Array<boolean>
  ): [jest.MockedObject<IntersectionObserver>, jest.MockedFn<any>] {
    const intersectionObserverInstanceMock: any = {
      root: null,
      rootMargin: '',
      thresholds: [0],
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
      takeRecords: jest.fn(),
    };

    window.IntersectionObserver = jest
      .fn()
      .mockImplementation((callback: (entries: Array<IntersectionObserverEntry>) => void) => {
        if (isIntersectingItems === undefined) {
          callback([]);

          return intersectionObserverInstanceMock;
        }

        const rect = {
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          toJSON: () => '',
        };
        callback(
          isIntersectingItems.map((isIntersecting) => ({
            isIntersecting,
            intersectionRatio: 0,
            intersectionRect: rect,
            rootBounds: rect,
            boundingClientRect: rect,
            target: document.createElement('div'),
            time: 0,
          }))
        );

        return intersectionObserverInstanceMock;
      });

    return [intersectionObserverInstanceMock, window.IntersectionObserver as jest.MockedFn<any>];
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockIntersectionObserver([true]);

    LensConfigBuilderMock.prototype.build.mockImplementation(() =>
      Promise.resolve({
        attributes: {} as any,
        state: {} as any,
        visualizationType: 'lnsXY',
      })
    );
    useChartLayersMock.mockReturnValue(mockChartLayers);
  });

  it('returns undefined initially before Lens attributes are built', async () => {
    const chartRef = createMockChartRef();

    const { result } = renderHook(() =>
      useLensProps({
        title: 'Test Chart',
        query: 'FROM metrics-*',
        seriesType: 'line',
        services: servicesMock as UnifiedHistogramServices,
        getTimeRange,
        discoverFetch$,
        chartRef,
      })
    );

    expect(result.current).toBeUndefined();

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
        seriesType: 'line',
        services: servicesMock as UnifiedHistogramServices,
        getTimeRange,
        discoverFetch$,
        chartRef,
      })
    );

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
        seriesType: 'line',
        services: servicesMock as UnifiedHistogramServices,
        getTimeRange,
        discoverFetch$,
        chartRef,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      discoverFetch$.next({ type: 'fetch' });
      jest.advanceTimersByTime(150);
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
        seriesType: 'line',
        services: servicesMock as UnifiedHistogramServices,
        getTimeRange,
        discoverFetch$,
        chartRef: { current: null },
      })
    );

    await waitFor(() => {
      expect(result.current).not.toBeUndefined();
    });
  });
});
