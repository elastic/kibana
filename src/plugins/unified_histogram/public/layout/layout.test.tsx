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
import { Chart } from '../chart';
import {
  UnifiedHistogramChartContext,
  UnifiedHistogramFetchStatus,
  UnifiedHistogramHitsContext,
} from '../types';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { unifiedHistogramServicesMock } from '../__mocks__/services';
import { UnifiedHistogramLayout, UnifiedHistogramLayoutProps } from './layout';
import { ResizableLayout, ResizableLayoutMode } from '@kbn/resizable-layout';

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
  const createHits = (): UnifiedHistogramHitsContext => ({
    status: UnifiedHistogramFetchStatus.complete,
    total: 10,
  });

  const createChart = (): UnifiedHistogramChartContext => ({
    hidden: false,
    timeInterval: 'auto',
  });

  const mountComponent = async ({
    services = unifiedHistogramServicesMock,
    hits = createHits(),
    chart = createChart(),
    container = null,
    ...rest
  }: Partial<Omit<UnifiedHistogramLayoutProps, 'hits' | 'chart'>> & {
    hits?: UnifiedHistogramHitsContext | null;
    chart?: UnifiedHistogramChartContext | null;
  } = {}) => {
    (searchSourceInstanceMock.fetch$ as jest.Mock).mockImplementation(
      jest.fn().mockReturnValue(of({ rawResponse: { hits: { total: 2 } } }))
    );

    const component = mountWithIntl(
      <UnifiedHistogramLayout
        services={services}
        hits={hits ?? undefined}
        chart={chart ?? undefined}
        container={container}
        dataView={dataViewWithTimefieldMock}
        query={{
          language: 'kuery',
          query: '',
        }}
        filters={[]}
        timeRange={{
          from: '2020-05-14T11:05:13.590',
          to: '2020-05-14T11:20:13.590',
        }}
        lensSuggestionsApi={jest.fn()}
        onSuggestionContextChange={jest.fn()}
        isChartLoading={false}
        {...rest}
      />
    );

    return component;
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
      const component = await mountComponent({
        chart: {
          ...createChart(),
          hidden: true,
        },
      });
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
      expect(component.find(Chart).find('div.euiFlexGroup').first().getDOMNode()).toHaveStyle({
        height: `${expectedHeight}px`,
      });
    });

    it('should not set a fixed height for Chart when layout mode is ResizableLayoutMode.Static and chart.hidden is true', async () => {
      const component = await mountComponent({ chart: { ...createChart(), hidden: true } });
      setBreakpoint(component, 's');
      const expectedHeight = component.find(ResizableLayout).prop('fixedPanelSize');
      expect(component.find(Chart).find('div.euiFlexGroup').first().getDOMNode()).not.toHaveStyle({
        height: `${expectedHeight}px`,
      });
    });

    it('should not set a fixed height for Chart when layout mode is ResizableLayoutMode.Static and chart is undefined', async () => {
      const component = await mountComponent({ chart: null });
      setBreakpoint(component, 's');
      const expectedHeight = component.find(ResizableLayout).prop('fixedPanelSize');
      expect(component.find(Chart).find('div.euiFlexGroup').first().getDOMNode()).not.toHaveStyle({
        height: `${expectedHeight}px`,
      });
    });
  });

  describe('topPanelHeight', () => {
    it('should pass a default fixedPanelSize to ResizableLayout when the topPanelHeight prop is undefined', async () => {
      const component = await mountComponent({ topPanelHeight: undefined });
      expect(component.find(ResizableLayout).prop('fixedPanelSize')).toBeGreaterThan(0);
    });
  });
});
