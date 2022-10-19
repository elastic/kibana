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
import type { UnifiedHistogramChartData, UnifiedHistogramFetchStatus } from '../types';
import { Chart } from './chart';
import type { ReactWrapper } from 'enzyme';
import { unifiedHistogramServicesMock } from '../__mocks__/services';
import { HitsCounter } from '../hits_counter';

async function mountComponent({
  noChart,
  noHits,
  chartHidden = false,
  appendHistogram,
  onEditVisualization = jest.fn(),
}: {
  noChart?: boolean;
  noHits?: boolean;
  chartHidden?: boolean;
  appendHistogram?: ReactElement;
  onEditVisualization?: null | (() => void);
} = {}) {
  const services = unifiedHistogramServicesMock;
  services.data.query.timefilter.timefilter.getAbsoluteTime = () => {
    return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
  };

  const chartData = {
    xAxisOrderedValues: [
      1623880800000, 1623967200000, 1624053600000, 1624140000000, 1624226400000, 1624312800000,
      1624399200000, 1624485600000, 1624572000000, 1624658400000, 1624744800000, 1624831200000,
      1624917600000, 1625004000000, 1625090400000,
    ],
    xAxisFormat: { id: 'date', params: { pattern: 'YYYY-MM-DD' } },
    xAxisLabel: 'order_date per day',
    yAxisFormat: { id: 'number' },
    ordered: {
      date: true,
      interval: {
        asMilliseconds: jest.fn(),
      },
      intervalESUnit: 'd',
      intervalESValue: 1,
      min: '2021-03-18T08:28:56.411Z',
      max: '2021-07-01T07:28:56.411Z',
    },
    yAxisLabel: 'Count',
    values: [
      { x: 1623880800000, y: 134 },
      { x: 1623967200000, y: 152 },
      { x: 1624053600000, y: 141 },
      { x: 1624140000000, y: 138 },
      { x: 1624226400000, y: 142 },
      { x: 1624312800000, y: 157 },
      { x: 1624399200000, y: 149 },
      { x: 1624485600000, y: 146 },
      { x: 1624572000000, y: 170 },
      { x: 1624658400000, y: 137 },
      { x: 1624744800000, y: 150 },
      { x: 1624831200000, y: 144 },
      { x: 1624917600000, y: 147 },
      { x: 1625004000000, y: 137 },
      { x: 1625090400000, y: 66 },
    ],
  } as unknown as UnifiedHistogramChartData;

  const props = {
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
          data: chartData,
        },
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
    await instance.update();
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
      await component
        .find('[data-test-subj="unifiedHistogramEditVisualization"]')
        .first()
        .simulate('click');
    });

    expect(fn).toHaveBeenCalled();
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
});
