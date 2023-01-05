/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement } from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { UnifiedHistogramFetchStatus } from '../types';
import { Chart } from './chart';
import type { ReactWrapper } from 'enzyme';
import { unifiedHistogramServicesMock } from '../__mocks__/services';
import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { of } from 'rxjs';
import { HitsCounter } from '../hits_counter';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { dataViewMock } from '../__mocks__/data_view';
import { BreakdownFieldSelector } from './breakdown_field_selector';
import { Histogram } from './histogram';

async function mountComponent({
  noChart,
  noHits,
  noBreakdown,
  chartHidden = false,
  appendHistogram,
  onEditVisualization = jest.fn(),
  dataView = dataViewWithTimefieldMock,
}: {
  noChart?: boolean;
  noHits?: boolean;
  noBreakdown?: boolean;
  chartHidden?: boolean;
  appendHistogram?: ReactElement;
  dataView?: DataView;
  onEditVisualization?: null | (() => void);
} = {}) {
  const services = unifiedHistogramServicesMock;
  services.data.query.timefilter.timefilter.getAbsoluteTime = () => {
    return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
  };
  (services.data.query.queryString.getDefaultQuery as jest.Mock).mockReturnValue({
    language: 'kuery',
    query: '',
  });
  (searchSourceInstanceMock.fetch$ as jest.Mock).mockImplementation(
    jest.fn().mockReturnValue(of({ rawResponse: { hits: { total: noHits ? 0 : 2 } } }))
  );

  const props = {
    dataView,
    services: unifiedHistogramServicesMock,
    hits: noHits
      ? undefined
      : {
          status: 'complete' as UnifiedHistogramFetchStatus,
          number: 2,
        },
    chart: noChart
      ? undefined
      : {
          status: 'complete' as UnifiedHistogramFetchStatus,
          hidden: chartHidden,
          timeInterval: 'auto',
          bucketInterval: {
            scaled: true,
            description: 'test',
            scale: 2,
          },
        },
    breakdown: noBreakdown ? undefined : { field: undefined },
    appendHistogram,
    onEditVisualization: onEditVisualization || undefined,
    onResetChartHeight: jest.fn(),
    onChartHiddenChange: jest.fn(),
    onTimeIntervalChange: jest.fn(),
  };

  let instance: ReactWrapper = {} as ReactWrapper;
  await act(async () => {
    instance = mountWithIntl(<Chart {...props} />);
    // wait for initial async loading to complete
    await new Promise((r) => setTimeout(r, 0));
    instance.update();
  });
  return instance;
}

describe('Chart', () => {
  test('render when chart is undefined', async () => {
    const component = await mountComponent({ noChart: true });
    expect(
      component.find('[data-test-subj="unifiedHistogramChartOptionsToggle"]').exists()
    ).toBeFalsy();
  });

  test('render when chart is defined and onEditVisualization is undefined', async () => {
    const component = await mountComponent({ onEditVisualization: null });
    expect(
      component.find('[data-test-subj="unifiedHistogramChartOptionsToggle"]').exists()
    ).toBeTruthy();
    expect(
      component.find('[data-test-subj="unifiedHistogramEditVisualization"]').exists()
    ).toBeFalsy();
  });

  test('render when chart is defined and onEditVisualization is defined', async () => {
    const component = await mountComponent();
    expect(
      component.find('[data-test-subj="unifiedHistogramChartOptionsToggle"]').exists()
    ).toBeTruthy();
    expect(
      component.find('[data-test-subj="unifiedHistogramEditVisualization"]').exists()
    ).toBeTruthy();
  });

  test('render when chart.hidden is true', async () => {
    const component = await mountComponent({ chartHidden: true });
    expect(
      component.find('[data-test-subj="unifiedHistogramChartOptionsToggle"]').exists()
    ).toBeTruthy();
    expect(component.find('[data-test-subj="unifiedHistogramChart"]').exists()).toBeFalsy();
  });

  test('render when chart.hidden is false', async () => {
    const component = await mountComponent({ chartHidden: false });
    expect(
      component.find('[data-test-subj="unifiedHistogramChartOptionsToggle"]').exists()
    ).toBeTruthy();
    expect(component.find('[data-test-subj="unifiedHistogramChart"]').exists()).toBeTruthy();
  });

  test('triggers onEditVisualization on click', async () => {
    const fn = jest.fn();
    const component = await mountComponent({ onEditVisualization: fn });
    await act(async () => {
      component
        .find('[data-test-subj="unifiedHistogramEditVisualization"]')
        .first()
        .simulate('click');
    });
    const lensAttributes = component.find(Histogram).prop('lensAttributes');
    expect(fn).toHaveBeenCalledWith(lensAttributes);
  });

  it('should render HitsCounter when hits is defined', async () => {
    const component = await mountComponent();
    expect(component.find(HitsCounter).exists()).toBeTruthy();
  });

  it('should not render HitsCounter when hits is undefined', async () => {
    const component = await mountComponent({ noHits: true });
    expect(component.find(HitsCounter).exists()).toBeFalsy();
  });

  it('should render the element passed to appendHistogram', async () => {
    const appendHistogram = <div data-test-subj="appendHistogram" />;
    const component = await mountComponent({ appendHistogram });
    expect(component.find('[data-test-subj="appendHistogram"]').exists()).toBeTruthy();
  });

  it('should not render chart if data view is not time based', async () => {
    const component = await mountComponent({ dataView: dataViewMock });
    expect(component.find('[data-test-subj="unifiedHistogramChart"]').exists()).toBeFalsy();
  });

  it('should render chart if data view is time based', async () => {
    const component = await mountComponent();
    expect(component.find('[data-test-subj="unifiedHistogramChart"]').exists()).toBeTruthy();
  });

  it('should render BreakdownFieldSelector when chart is visible and breakdown is defined', async () => {
    const component = await mountComponent();
    expect(component.find(BreakdownFieldSelector).exists()).toBeTruthy();
  });

  it('should not render BreakdownFieldSelector when chart is hidden', async () => {
    const component = await mountComponent({ chartHidden: true });
    expect(component.find(BreakdownFieldSelector).exists()).toBeFalsy();
  });

  it('should not render BreakdownFieldSelector when chart is visible and breakdown is undefined', async () => {
    const component = await mountComponent({ noBreakdown: true });
    expect(component.find(BreakdownFieldSelector).exists()).toBeFalsy();
  });
});
