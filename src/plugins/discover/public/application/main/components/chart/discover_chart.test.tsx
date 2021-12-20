/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Subject, BehaviorSubject } from 'rxjs';
import { mountWithIntl } from '@kbn/test/jest';
import { setHeaderActionMenuMounter } from '../../../../kibana_services';
import { esHits } from '../../../../__mocks__/es_hits';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { createSearchSourceMock } from '../../../../../../data/common/search/search_source/mocks';
import { GetStateReturn } from '../../services/discover_state';
import { DataCharts$, DataTotalHits$ } from '../../utils/use_saved_search';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { FetchStatus } from '../../../types';
import { Chart } from './point_series';
import { DiscoverChart } from './discover_chart';
import { VIEW_MODE } from '../../../../components/view_mode_toggle';
import { KibanaContextProvider } from '../../../../../../kibana_react/public';

setHeaderActionMenuMounter(jest.fn());

function mountComponent(isTimeBased: boolean = false) {
  const searchSourceMock = createSearchSourceMock({});
  const services = discoverServiceMock;
  services.data.query.timefilter.timefilter.getAbsoluteTime = () => {
    return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
  };

  const totalHits$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: Number(esHits.length),
  }) as DataTotalHits$;

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

  const charts$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    chartData,
    bucketInterval: {
      scaled: true,
      description: 'test',
      scale: 2,
    },
  }) as DataCharts$;

  const props = {
    isTimeBased,
    resetSavedSearch: jest.fn(),
    savedSearch: savedSearchMock,
    savedSearchDataChart$: charts$,
    savedSearchDataTotalHits$: totalHits$,
    savedSearchRefetch$: new Subject(),
    searchSource: searchSourceMock,
    state: { columns: [] },
    stateContainer: {} as GetStateReturn,
    viewMode: VIEW_MODE.DOCUMENT_LEVEL,
    setDiscoverViewMode: jest.fn(),
  };

  return mountWithIntl(
    <KibanaContextProvider services={services}>
      <DiscoverChart {...props} />
    </KibanaContextProvider>
  );
}

describe('Discover chart', () => {
  test('render without timefield', () => {
    const component = mountComponent();
    expect(component.find('[data-test-subj="discoverChartOptionsToggle"]').exists()).toBeFalsy();
  });
  test('render with filefield', () => {
    const component = mountComponent(true);
    expect(component.find('[data-test-subj="discoverChartOptionsToggle"]').exists()).toBeTruthy();
  });
});
