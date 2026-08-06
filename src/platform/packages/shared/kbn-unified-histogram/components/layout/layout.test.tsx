/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  UnifiedHistogramChartContext,
  UnifiedHistogramFetchParamsExternal,
  UnifiedHistogramHitsContext,
} from '../../types';
import type { UseUnifiedHistogramProps } from '../../hooks/use_unified_histogram';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { of } from 'rxjs';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { screen, waitFor } from '@testing-library/react';
import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { UnifiedHistogramChart } from '../chart';
import { UnifiedHistogramFetchStatus } from '../../types';
import { UnifiedHistogramLayout } from './layout';
import { unifiedHistogramServicesMock } from '../../__mocks__/services';
import { useUnifiedHistogram } from '../../hooks/use_unified_histogram';
import React, { useEffect } from 'react';

let mockBreakpoint = 'l';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    useIsWithinBreakpoints: (breakpoints: string[]) => {
      return breakpoints.includes(mockBreakpoint);
    },
  };
});

const mockedSearchSourceInstanceMockFetch$ = jest.mocked(searchSourceInstanceMock.fetch$);

interface MountComponentProps extends Partial<UseUnifiedHistogramProps> {
  hits?: UnifiedHistogramHitsContext | null;
  chart?: UnifiedHistogramChartContext | null;
  topPanelHeight?: number | null;
  isMainPanelHidden?: boolean;
}

describe('Layout', () => {
  const mountComponent = async ({
    services = unifiedHistogramServicesMock,
    hits,
    chart,
    topPanelHeight,
    isMainPanelHidden,
    ...rest
  }: MountComponentProps = {}) => {
    mockedSearchSourceInstanceMockFetch$.mockImplementation(
      jest.fn().mockReturnValue(of({ rawResponse: { hits: { total: 2 } } }))
    );

    const fetchParamsExternal: UnifiedHistogramFetchParamsExternal = {
      searchSessionId: 'session-id',
      dataView: dataViewWithTimefieldMock,
      query: {
        language: 'kuery',
        query: '',
      },
      filters: [],
      timeRange: {
        from: '2020-05-14T11:05:13.590',
        to: '2020-05-14T11:20:13.590',
      },
      relativeTimeRange: {
        from: '2020-05-14T11:05:13.590',
        to: '2020-05-14T11:20:13.590',
      },
      requestAdapter: new RequestAdapter(),
    };

    const Wrapper = () => {
      const unifiedHistogram = useUnifiedHistogram({
        services,
        initialState: {
          totalHitsStatus: hits?.status ?? UnifiedHistogramFetchStatus.complete,
          totalHitsResult: hits?.total ?? 10,
          chartHidden: chart?.hidden ?? false,
        },
        isChartLoading: false,
        ...rest,
      });

      useEffect(() => {
        if (!unifiedHistogram.isInitialized && unifiedHistogram.api) {
          unifiedHistogram.api.fetch(fetchParamsExternal);
        }
      }, [unifiedHistogram.isInitialized, unifiedHistogram.api]);

      if (!unifiedHistogram.isInitialized) return null;

      const resolvedHits =
        hits === undefined ? unifiedHistogram.chartProps.hits : hits ?? undefined;
      const resolvedChart =
        chart === undefined ? unifiedHistogram.chartProps.chart : chart ?? undefined;

      return (
        <UnifiedHistogramLayout
          unifiedHistogramChart={
            <UnifiedHistogramChart
              {...unifiedHistogram.chartProps}
              hits={resolvedHits}
              chart={resolvedChart}
              renderToggleActions={() => <span data-test-subj="layout-toggle-actions" />}
            />
          }
          {...unifiedHistogram.layoutProps}
          hits={resolvedHits}
          chart={resolvedChart}
          isMainPanelHidden={isMainPanelHidden}
          topPanelHeight={
            topPanelHeight === undefined
              ? unifiedHistogram.layoutProps.topPanelHeight
              : topPanelHeight ?? undefined
          }
        />
      );
    };

    const { rerender } = renderWithI18n(<Wrapper />);

    await waitFor(() => {
      expect(
        screen.queryAllByTestId(/unifiedHistogram(MainPanel|ChartContainer)/).length
      ).toBeGreaterThan(0);
    });

    const setBreakpoint = async (breakpoint: string) => {
      mockBreakpoint = breakpoint;

      rerender(<Wrapper />);

      await waitFor(() => {
        expect(
          screen.queryAllByTestId(/unifiedHistogram(MainPanel|ChartContainer)/).length
        ).toBeGreaterThan(0);
      });
    };

    return { setBreakpoint };
  };

  beforeEach(() => {
    mockBreakpoint = 'l';
  });

  describe('PANELS_MODE', () => {
    it('should set the layout mode to ResizableLayoutMode.Resizable when viewing on medium screens and above', async () => {
      const { setBreakpoint } = await mountComponent();

      await setBreakpoint('m');

      expect(screen.getByTestId('unifiedHistogramResizableContainer')).toBeVisible();
      expect(screen.getByTestId('unifiedHistogramResizableButton')).toBeVisible();
    });

    it('should set the layout mode to ResizableLayoutMode.Static when viewing on small screens and below', async () => {
      const { setBreakpoint } = await mountComponent();

      await setBreakpoint('s');

      expect(screen.getByTestId('resizableLayoutStaticContainer')).toBeVisible();
      expect(screen.queryByTestId('unifiedHistogramResizableContainer')).not.toBeInTheDocument();
      expect(screen.queryByTestId('unifiedHistogramResizableButton')).not.toBeInTheDocument();
    });

    it('should set the layout mode to ResizableLayoutMode.Static if chart.hidden is true', async () => {
      await mountComponent({
        chart: { timeInterval: 'auto', hidden: true },
      });

      expect(screen.getByTestId('resizableLayoutStaticContainer')).toBeVisible();
      expect(screen.queryByTestId('unifiedHistogramResizableContainer')).not.toBeInTheDocument();
      expect(screen.queryByTestId('unifiedHistogramResizableButton')).not.toBeInTheDocument();
    });

    it('should set the layout mode to ResizableLayoutMode.Static if chart is undefined', async () => {
      await mountComponent({ chart: null });

      expect(screen.getByTestId('resizableLayoutStaticContainer')).toBeVisible();
      expect(screen.queryByTestId('unifiedHistogramResizableContainer')).not.toBeInTheDocument();
      expect(screen.queryByTestId('unifiedHistogramResizableButton')).not.toBeInTheDocument();
    });

    it('should set the layout mode to ResizableLayoutMode.Single if chart and hits are undefined', async () => {
      await mountComponent({ chart: null, hits: null });

      expect(screen.getByTestId('resizableLayoutSingleContainer')).toBeVisible();
      expect(screen.queryByTestId('unifiedHistogramResizableContainer')).not.toBeInTheDocument();
      expect(screen.queryByTestId('unifiedHistogramResizableButton')).not.toBeInTheDocument();
    });

    it('should set the layout mode to ResizableLayoutMode.Single if the main panel is hidden', async () => {
      await mountComponent({ isMainPanelHidden: true });

      expect(screen.getByTestId('resizableLayoutSingleContainer')).toBeVisible();
      expect(screen.queryByTestId('unifiedHistogramResizableContainer')).not.toBeInTheDocument();
      expect(screen.queryByTestId('unifiedHistogramResizableButton')).not.toBeInTheDocument();
    });

    it('should hide the main panel and keep the chart visible if the main panel is hidden', async () => {
      await mountComponent({ isMainPanelHidden: true });

      expect(screen.queryByTestId('unifiedHistogramMainPanel')).not.toBeInTheDocument();
      expect(screen.getByTestId('unifiedHistogramChartContainer')).toBeVisible();
    });

    it('should ignore isMainPanelHidden if the chart is hidden', async () => {
      await mountComponent({
        chart: { timeInterval: 'auto', hidden: true },
        isMainPanelHidden: true,
      });

      expect(screen.getByTestId('resizableLayoutStaticContainer')).toBeVisible();
      expect(screen.getByTestId('unifiedHistogramMainPanel')).toBeVisible();
    });

    it('should set a fixed height for Chart when layout mode is ResizableLayoutMode.Static and chart.hidden is false', async () => {
      const { setBreakpoint } = await mountComponent();

      await setBreakpoint('s');

      const chartContainer = screen.getByTestId('unifiedHistogramChartContainer');
      const computedStyle = window.getComputedStyle(chartContainer);
      expect(computedStyle.height).toMatch(/^\d+px$/);
    });

    it('should render the hidden chart placeholder when layout mode is ResizableLayoutMode.Static and chart.hidden is true', async () => {
      const { setBreakpoint } = await mountComponent({
        chart: { timeInterval: 'auto', hidden: true },
      });

      await setBreakpoint('s');

      expect(screen.getByTestId('unifiedHistogramChartPanelHidden')).toBeVisible();
      expect(screen.queryByTestId('unifiedHistogramChartContainer')).not.toBeInTheDocument();
    });

    it('should render the hidden chart placeholder when layout mode is ResizableLayoutMode.Static and chart is undefined', async () => {
      const { setBreakpoint } = await mountComponent({ chart: null });

      await setBreakpoint('s');

      expect(screen.getByTestId('unifiedHistogramChartPanelHidden')).toBeVisible();
      expect(screen.queryByTestId('unifiedHistogramChartContainer')).not.toBeInTheDocument();
    });
  });
});
