/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { ReactWrapper } from 'enzyme';
import React from 'react';
import { of } from 'rxjs';
import { UnifiedHistogramChart } from '../chart';
import {
  UnifiedHistogramChartContext,
  UnifiedHistogramFetchStatus,
  UnifiedHistogramHitsContext,
} from '../../types';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { unifiedHistogramServicesMock } from '../../__mocks__/services';
import { UnifiedHistogramLayout } from './layout';
import { ResizableLayout, ResizableLayoutMode } from '@kbn/resizable-layout';
import { UseUnifiedHistogramProps, useUnifiedHistogram } from '../../hooks/use_unified_histogram';
import { act } from 'react-dom/test-utils';

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

describe('Layout', () => {
  const mountComponent = async ({
    services = unifiedHistogramServicesMock,
    hits,
    chart,
    topPanelHeight,
    ...rest
  }: Partial<UseUnifiedHistogramProps> & {
    hits?: UnifiedHistogramHitsContext | null;
    chart?: UnifiedHistogramChartContext | null;
    topPanelHeight?: number | null;
  } = {}) => {
    (searchSourceInstanceMock.fetch$ as jest.Mock).mockImplementation(
      jest.fn().mockReturnValue(of({ rawResponse: { hits: { total: 2 } } }))
    );
    const Wrapper = () => {
      const unifiedHistogram = useUnifiedHistogram({
        services,
        initialState: {
          totalHitsStatus: hits?.status ?? UnifiedHistogramFetchStatus.complete,
          totalHitsResult: hits?.total ?? 10,
          chartHidden: chart?.hidden ?? false,
          timeInterval: chart?.timeInterval ?? 'auto',
        },
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
        isChartLoading: false,
        ...rest,
      });

      if (!unifiedHistogram.isInitialized) {
        return null;
      }

      return (
        <UnifiedHistogramLayout
          unifiedHistogramChart={<UnifiedHistogramChart {...unifiedHistogram.chartProps} />}
          {...unifiedHistogram.layoutProps}
          hits={hits === undefined ? unifiedHistogram.layoutProps.hits : hits ?? undefined}
          chart={chart === undefined ? unifiedHistogram.layoutProps.chart : chart ?? undefined}
          topPanelHeight={
            topPanelHeight === undefined
              ? unifiedHistogram.layoutProps.topPanelHeight
              : topPanelHeight ?? undefined
          }
        />
      );
    };
    const component = mountWithIntl(<Wrapper />);
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    return component.update();
  };

  const setBreakpoint = (component: ReactWrapper, breakpoint: string) => {
    mockBreakpoint = breakpoint;
    component.setProps({}).update();
  };

  beforeEach(() => {
    mockBreakpoint = 'l';
  });

  describe('PANELS_MODE', () => {
    it('should set the layout mode to ResizableLayoutMode.Resizable when viewing on medium screens and above', async () => {
      const component = await mountComponent();
      setBreakpoint(component, 'm');
      expect(component.find(ResizableLayout).prop('mode')).toBe(ResizableLayoutMode.Resizable);
    });

    it('should set the layout mode to ResizableLayoutMode.Static when viewing on small screens and below', async () => {
      const component = await mountComponent();
      setBreakpoint(component, 's');
      expect(component.find(ResizableLayout).prop('mode')).toBe(ResizableLayoutMode.Static);
    });

    it('should set the layout mode to ResizableLayoutMode.Static if chart.hidden is true', async () => {
      const component = await mountComponent({ chart: { timeInterval: 'auto', hidden: true } });
      expect(component.find(ResizableLayout).prop('mode')).toBe(ResizableLayoutMode.Static);
    });

    it('should set the layout mode to ResizableLayoutMode.Static if chart is undefined', async () => {
      const component = await mountComponent({ chart: null });
      expect(component.find(ResizableLayout).prop('mode')).toBe(ResizableLayoutMode.Static);
    });

    it('should set the layout mode to ResizableLayoutMode.Single if chart and hits are undefined', async () => {
      const component = await mountComponent({ chart: null, hits: null });
      expect(component.find(ResizableLayout).prop('mode')).toBe(ResizableLayoutMode.Single);
    });

    it('should set a fixed height for Chart when layout mode is ResizableLayoutMode.Static and chart.hidden is false', async () => {
      const component = await mountComponent();
      setBreakpoint(component, 's');
      const expectedHeight = component.find(ResizableLayout).prop('fixedPanelSize');
      expect(
        component.find(UnifiedHistogramChart).find('div.euiFlexGroup').first().getDOMNode()
      ).toHaveStyle({
        height: `${expectedHeight}px`,
      });
    });

    it('should not set a fixed height for Chart when layout mode is ResizableLayoutMode.Static and chart.hidden is true', async () => {
      const component = await mountComponent({ chart: { timeInterval: 'auto', hidden: true } });
      setBreakpoint(component, 's');
      const expectedHeight = component.find(ResizableLayout).prop('fixedPanelSize');
      expect(
        component.find(UnifiedHistogramChart).find('div.euiFlexGroup').first().getDOMNode()
      ).not.toHaveStyle({
        height: `${expectedHeight}px`,
      });
    });

    it('should not set a fixed height for Chart when layout mode is ResizableLayoutMode.Static and chart is undefined', async () => {
      const component = await mountComponent({ chart: null });
      setBreakpoint(component, 's');
      const expectedHeight = component.find(ResizableLayout).prop('fixedPanelSize');
      expect(
        component.find(UnifiedHistogramChart).find('div.euiFlexGroup').first().getDOMNode()
      ).not.toHaveStyle({
        height: `${expectedHeight}px`,
      });
    });
  });

  describe('topPanelHeight', () => {
    it('should pass a default fixedPanelSize to ResizableLayout when the topPanelHeight prop is undefined', async () => {
      const component = await mountComponent({ topPanelHeight: null });
      expect(component.find(ResizableLayout).prop('fixedPanelSize')).toBeGreaterThan(0);
    });
  });
});
