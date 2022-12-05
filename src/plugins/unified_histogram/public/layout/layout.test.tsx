/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { ReactWrapper } from 'enzyme';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { of } from 'rxjs';
import { Chart } from '../chart';
import { Panels, PANELS_MODE } from '../panels';
import {
  UnifiedHistogramChartContext,
  UnifiedHistogramFetchStatus,
  UnifiedHistogramHitsContext,
} from '../types';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { unifiedHistogramServicesMock } from '../__mocks__/services';
import { UnifiedHistogramLayout, UnifiedHistogramLayoutProps } from './layout';

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
    resizeRef = { current: null },
    ...rest
  }: Partial<Omit<UnifiedHistogramLayoutProps, 'hits' | 'chart'>> & {
    hits?: UnifiedHistogramHitsContext | null;
    chart?: UnifiedHistogramChartContext | null;
  } = {}) => {
    services.data.query.timefilter.timefilter.getAbsoluteTime = () => {
      return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
    };

    (services.data.query.queryString.getDefaultQuery as jest.Mock).mockReturnValue({
      language: 'kuery',
      query: '',
    });
    (searchSourceInstanceMock.fetch$ as jest.Mock).mockImplementation(
      jest.fn().mockReturnValue(of({ rawResponse: { hits: { total: 2 } } }))
    );

    const component = mountWithIntl(
      <UnifiedHistogramLayout
        services={services}
        hits={hits ?? undefined}
        chart={chart ?? undefined}
        resizeRef={resizeRef}
        dataView={dataViewWithTimefieldMock}
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
    it('should set the panels mode to PANELS_MODE.RESIZABLE when viewing on medium screens and above', async () => {
      const component = await mountComponent();
      setBreakpoint(component, 'm');
      expect(component.find(Panels).prop('mode')).toBe(PANELS_MODE.RESIZABLE);
    });

    it('should set the panels mode to PANELS_MODE.FIXED when viewing on small screens and below', async () => {
      const component = await mountComponent();
      setBreakpoint(component, 's');
      expect(component.find(Panels).prop('mode')).toBe(PANELS_MODE.FIXED);
    });

    it('should set the panels mode to PANELS_MODE.FIXED if chart.hidden is true', async () => {
      const component = await mountComponent({
        chart: {
          ...createChart(),
          hidden: true,
        },
      });
      expect(component.find(Panels).prop('mode')).toBe(PANELS_MODE.FIXED);
    });

    it('should set the panels mode to PANELS_MODE.FIXED if chart is undefined', async () => {
      const component = await mountComponent({ chart: null });
      expect(component.find(Panels).prop('mode')).toBe(PANELS_MODE.FIXED);
    });

    it('should set the panels mode to PANELS_MODE.SINGLE if chart and hits are undefined', async () => {
      const component = await mountComponent({ chart: null, hits: null });
      expect(component.find(Panels).prop('mode')).toBe(PANELS_MODE.SINGLE);
    });

    it('should set a fixed height for Chart when panels mode is PANELS_MODE.FIXED and chart.hidden is false', async () => {
      const component = await mountComponent();
      setBreakpoint(component, 's');
      const expectedHeight = component.find(Panels).prop('topPanelHeight');
      expect(component.find(Chart).find('div.euiFlexGroup').first().getDOMNode()).toHaveStyle({
        height: `${expectedHeight}px`,
      });
    });

    it('should not set a fixed height for Chart when panels mode is PANELS_MODE.FIXED and chart.hidden is true', async () => {
      const component = await mountComponent({ chart: { ...createChart(), hidden: true } });
      setBreakpoint(component, 's');
      const expectedHeight = component.find(Panels).prop('topPanelHeight');
      expect(component.find(Chart).find('div.euiFlexGroup').first().getDOMNode()).not.toHaveStyle({
        height: `${expectedHeight}px`,
      });
    });

    it('should not set a fixed height for Chart when panels mode is PANELS_MODE.FIXED and chart is undefined', async () => {
      const component = await mountComponent({ chart: null });
      setBreakpoint(component, 's');
      const expectedHeight = component.find(Panels).prop('topPanelHeight');
      expect(component.find(Chart).find('div.euiFlexGroup').first().getDOMNode()).not.toHaveStyle({
        height: `${expectedHeight}px`,
      });
    });

    it('should pass undefined for onResetChartHeight to Chart when panels mode is PANELS_MODE.FIXED', async () => {
      const component = await mountComponent({ topPanelHeight: 123 });
      expect(component.find(Chart).prop('onResetChartHeight')).toBeDefined();
      setBreakpoint(component, 's');
      expect(component.find(Chart).prop('onResetChartHeight')).toBeUndefined();
    });
  });

  describe('topPanelHeight', () => {
    it('should pass a default topPanelHeight to Panels when the topPanelHeight prop is undefined', async () => {
      const component = await mountComponent({ topPanelHeight: undefined });
      expect(component.find(Panels).prop('topPanelHeight')).toBeGreaterThan(0);
    });

    it('should reset the topPanelHeight to the default when onResetChartHeight is called on Chart', async () => {
      const component: ReactWrapper = await mountComponent({
        onTopPanelHeightChange: jest.fn((topPanelHeight) => {
          component.setProps({ topPanelHeight });
        }),
      });
      const defaultTopPanelHeight = component.find(Panels).prop('topPanelHeight');
      const newTopPanelHeight = 123;
      expect(component.find(Panels).prop('topPanelHeight')).not.toBe(newTopPanelHeight);
      act(() => {
        component.find(Panels).prop('onTopPanelHeightChange')!(newTopPanelHeight);
      });
      expect(component.find(Panels).prop('topPanelHeight')).toBe(newTopPanelHeight);
      act(() => {
        component.find(Chart).prop('onResetChartHeight')!();
      });
      expect(component.find(Panels).prop('topPanelHeight')).toBe(defaultTopPanelHeight);
    });

    it('should pass undefined for onResetChartHeight to Chart when the chart is the default height', async () => {
      const component = await mountComponent({
        topPanelHeight: 123,
        onTopPanelHeightChange: jest.fn((topPanelHeight) => {
          component.setProps({ topPanelHeight });
        }),
      });
      expect(component.find(Chart).prop('onResetChartHeight')).toBeDefined();
      act(() => {
        component.find(Chart).prop('onResetChartHeight')!();
      });
      component.update();
      expect(component.find(Chart).prop('onResetChartHeight')).toBeUndefined();
    });
  });
});
