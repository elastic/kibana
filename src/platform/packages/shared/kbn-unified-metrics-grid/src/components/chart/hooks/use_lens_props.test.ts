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
  const mockChartLayers: Array<LensSeriesLayer> = [
    {
      type: 'series',
      seriesType: 'line',
      xAxis: { field: '@timestamp', type: 'dateHistogram', colorPalette: 'foo' },
      yAxis: [{ value: 'foo' }],
    },
  ];
  const discoverFetch$ = new BehaviorSubject<UnifiedHistogramInputMessage>({ type: 'fetch' });
  const timeRange: TimeRange = { from: 'now-1h', to: 'now' };

  beforeEach(() => {
    LensConfigBuilderMock.prototype.build.mockImplementation(() =>
      Promise.resolve({
        attributes: {} as any,
        state: {} as any,
        visualizationType: 'lnsXY',
      })
    );
    useChartLayersMock.mockReturnValue(mockChartLayers);
    jest.clearAllMocks();
  });

  it('returns undefined initially before Lens attributes are built', async () => {
    const { result } = renderHook(() =>
      useLensProps({
        title: 'Test Chart',
        query: 'FROM metrics-*',
        seriesType: 'line',
        services: servicesMock as UnifiedHistogramServices,
        timeRange,
        discoverFetch$,
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
    renderHook(() =>
      useLensProps({
        title: 'Test Chart',
        query: 'FROM metrics-*',
        seriesType: 'line',
        services: servicesMock as UnifiedHistogramServices,
        timeRange,
        discoverFetch$,
      })
    );

    await waitFor(() => {
      expect(LensConfigBuilder.prototype.build).toHaveBeenCalledWith({
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
      });
    });
  });

  it('updates lensProps when discoverFetch$ emits', async () => {
    const { result } = renderHook(() =>
      useLensProps({
        title: 'Test Chart',
        query: 'FROM metrics-*',
        seriesType: 'line',
        services: servicesMock as UnifiedHistogramServices,
        timeRange,
        discoverFetch$,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

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
        timeRange,
        viewMode: 'view',
      });
    });
  });
});
