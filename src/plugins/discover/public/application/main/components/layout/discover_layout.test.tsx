/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Subject, BehaviorSubject } from 'rxjs';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { setHeaderActionMenuMounter } from '../../../../kibana_services';
import { DiscoverLayout, SIDEBAR_CLOSED_KEY } from './discover_layout';
import { esHits } from '../../../../__mocks__/es_hits';
import { indexPatternMock } from '../../../../__mocks__/index_pattern';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { createSearchSourceMock } from '../../../../../../data/common/search/search_source/mocks';
import type { DataView, DataViewAttributes } from '../../../../../../data_views/public';
import { SavedObject } from '../../../../../../../core/types';
import { indexPatternWithTimefieldMock } from '../../../../__mocks__/index_pattern_with_timefield';
import { GetStateReturn } from '../../services/discover_state';
import { DiscoverLayoutProps } from './types';
import {
  AvailableFields$,
  DataCharts$,
  DataDocuments$,
  DataMain$,
  DataTotalHits$,
} from '../../utils/use_saved_search';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { FetchStatus } from '../../../types';
import { RequestAdapter } from '../../../../../../inspector';
import { Chart } from '../chart/point_series';
import { DiscoverSidebar } from '../sidebar/discover_sidebar';
import { ElasticSearchHit } from '../../../../types';
import { LocalStorageMock } from 'src/plugins/discover/public/__mocks__/local_storage_mock';
import { KibanaContextProvider } from '../../../../../../kibana_react/public';
import { DiscoverServices } from '../../../../build_services';

setHeaderActionMenuMounter(jest.fn());

function mountComponent(indexPattern: DataView, prevSidebarClosed?: boolean) {
  const searchSourceMock = createSearchSourceMock({});
  const services = {
    ...discoverServiceMock,
    storage: new LocalStorageMock({
      [SIDEBAR_CLOSED_KEY]: prevSidebarClosed,
    }) as unknown as Storage,
  } as unknown as DiscoverServices;
  services.data.query.timefilter.timefilter.getAbsoluteTime = () => {
    return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
  };

  const indexPatternList = [indexPattern].map((ip) => {
    return { ...ip, ...{ attributes: { title: ip.title } } };
  }) as unknown as Array<SavedObject<DataViewAttributes>>;

  const main$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    foundDocuments: true,
  }) as DataMain$;

  const documents$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: esHits as ElasticSearchHit[],
  }) as DataDocuments$;

  const availableFields$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    fields: [] as string[],
  }) as AvailableFields$;

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

  const savedSearchData$ = {
    main$,
    documents$,
    totalHits$,
    charts$,
    availableFields$,
  };

  const props = {
    indexPattern,
    indexPatternList,
    inspectorAdapters: { requests: new RequestAdapter() },
    navigateTo: jest.fn(),
    onChangeIndexPattern: jest.fn(),
    onUpdateQuery: jest.fn(),
    resetSavedSearch: jest.fn(),
    savedSearch: savedSearchMock,
    savedSearchData$,
    savedSearchRefetch$: new Subject(),
    searchSource: searchSourceMock,
    state: { columns: [] },
    stateContainer: { setAppState: () => {} } as unknown as GetStateReturn,
    setExpandedDoc: jest.fn(),
  };

  return mountWithIntl(
    <KibanaContextProvider services={services}>
      <DiscoverLayout {...(props as DiscoverLayoutProps)} />
    </KibanaContextProvider>
  );
}

describe('Discover component', () => {
  test('selected index pattern without time field displays no chart toggle', () => {
    const component = mountComponent(indexPatternMock);
    expect(component.find('[data-test-subj="discoverChartOptionsToggle"]').exists()).toBeFalsy();
  });

  test('selected index pattern with time field displays chart toggle', () => {
    const component = mountComponent(indexPatternWithTimefieldMock);
    expect(component.find('[data-test-subj="discoverChartOptionsToggle"]').exists()).toBeTruthy();
  });

  describe('sidebar', () => {
    test('should be opened if discover:sidebarClosed was not set', () => {
      const component = mountComponent(indexPatternWithTimefieldMock, undefined);
      expect(component.find(DiscoverSidebar).length).toBe(1);
    });

    test('should be opened if discover:sidebarClosed is false', () => {
      const component = mountComponent(indexPatternWithTimefieldMock, false);
      expect(component.find(DiscoverSidebar).length).toBe(1);
    });

    test('should be closed if discover:sidebarClosed is true', () => {
      const component = mountComponent(indexPatternWithTimefieldMock, true);
      expect(component.find(DiscoverSidebar).length).toBe(0);
    });
  });
});
