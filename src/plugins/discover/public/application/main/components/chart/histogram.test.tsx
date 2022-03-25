/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { BehaviorSubject } from 'rxjs';
import { FetchStatus } from '../../../types';
import { DataCharts$ } from '../../utils/use_saved_search';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { Chart } from './point_series';
import { DiscoverHistogram } from './histogram';
import React from 'react';
import * as hooks from '../../utils/use_data_state';
import { KibanaContextProvider } from '../../../../../../kibana_react/public';

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
} as unknown as Chart;

function mountComponent(fetchStatus: FetchStatus) {
  const services = discoverServiceMock;
  services.data.query.timefilter.timefilter.getAbsoluteTime = () => {
    return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
  };

  const charts$ = new BehaviorSubject({
    fetchStatus,
    chartData,
    bucketInterval: {
      scaled: true,
      description: 'test',
      scale: 2,
    },
  }) as DataCharts$;

  const timefilterUpdateHandler = jest.fn();

  const props = {
    savedSearchData$: charts$,
    timefilterUpdateHandler,
  };

  return mountWithIntl(
    <KibanaContextProvider services={services}>
      <DiscoverHistogram {...props} />
    </KibanaContextProvider>
  );
}

describe('Histogram', () => {
  it('renders correctly', () => {
    jest.spyOn(hooks, 'useDataState').mockImplementation(() => ({
      fetchStatus: FetchStatus.COMPLETE,
      chartData,
      bucketInterval: {
        scaled: true,
        description: 'Bucket interval',
        scale: 1,
      },
    }));
    const component = mountComponent(FetchStatus.COMPLETE);
    expect(component.find('[data-test-subj="discoverChart"]').exists()).toBe(true);
  });

  it('renders error correctly', () => {
    jest.spyOn(hooks, 'useDataState').mockImplementation(() => ({
      fetchStatus: FetchStatus.ERROR,
      error: new Error('Loading error'),
    }));
    const component = mountComponent(FetchStatus.ERROR);
    expect(component.find('[data-test-subj="discoverChart"]').exists()).toBe(false);
    expect(component.find('.dscHistogram__errorChartContainer').exists()).toBe(true);
    expect(component.find('.dscHistogram__errorChart__text').get(1).props.children).toBe(
      'Loading error'
    );
  });

  it('renders loading state correctly', () => {
    jest.spyOn(hooks, 'useDataState').mockImplementation(() => ({
      fetchStatus: FetchStatus.LOADING,
      chartData: null,
    }));
    const component = mountComponent(FetchStatus.LOADING);
    expect(component.find('[data-test-subj="discoverChart"]').exists()).toBe(true);
    expect(component.find('.dscChart__loading').exists()).toBe(true);
  });
});
