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
import type { Query, AggregateQuery } from '@kbn/es-query';
import { setHeaderActionMenuMounter } from '../../../../kibana_services';
import { DiscoverLayout, SIDEBAR_CLOSED_KEY } from './discover_layout';
import { esHits } from '../../../../__mocks__/es_hits';
import { dataViewMock } from '../../../../__mocks__/data_view';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import type { DataView } from '@kbn/data-views-plugin/public';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import { DiscoverLayoutProps } from './types';
import {
  AvailableFields$,
  DataCharts$,
  DataDocuments$,
  DataMain$,
  DataTotalHits$,
  RecordRawType,
} from '../../hooks/use_saved_search';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { FetchStatus } from '../../../types';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { DiscoverSidebar } from '../sidebar/discover_sidebar';
import { LocalStorageMock } from '../../../../__mocks__/local_storage_mock';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { DiscoverServices } from '../../../../build_services';
import { buildDataTableRecord } from '../../../../utils/build_data_record';
import type { UnifiedHistogramChartData } from '@kbn/unified-histogram-plugin/public';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { setTimeout } from 'timers/promises';
import { act } from 'react-dom/test-utils';
import { DiscoverMainProvider } from '../../services/discover_state_provider';

jest.mock('@kbn/unified-histogram-plugin/public', () => {
  const originalModule = jest.requireActual('@kbn/unified-histogram-plugin/public');

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

  return {
    ...originalModule,
    buildChartData: jest.fn().mockImplementation(() => ({
      chartData,
      bucketInterval: {
        scaled: true,
        description: 'test',
        scale: 2,
      },
    })),
  };
});

setHeaderActionMenuMounter(jest.fn());

async function mountComponent(
  dataView: DataView,
  prevSidebarClosed?: boolean,
  mountOptions: { attachTo?: HTMLElement } = {},
  query?: Query | AggregateQuery,
  isPlainRecord?: boolean
) {
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

  const stateContainer = getDiscoverStateMock({ isTimeBased: true });

  const main$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    recordRawType: isPlainRecord ? RecordRawType.PLAIN : RecordRawType.DOCUMENT,
    foundDocuments: true,
  }) as DataMain$;

  const documents$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: esHits.map((esHit) => buildDataTableRecord(esHit, dataView)),
  }) as DataDocuments$;

  const availableFields$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    fields: [] as string[],
  }) as AvailableFields$;

  const totalHits$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: Number(esHits.length),
  }) as DataTotalHits$;

  const charts$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    response: {} as unknown as SearchResponse,
  }) as DataCharts$;

  const savedSearchData$ = {
    main$,
    documents$,
    totalHits$,
    charts$,
    availableFields$,
  };

  stateContainer.setAppState({ interval: 'auto', query });
  stateContainer.internalState.transitions.setDataView(dataView);

  const props: DiscoverLayoutProps = {
    inspectorAdapters: { requests: new RequestAdapter() },
    navigateTo: jest.fn(),
    onChangeDataView: jest.fn(),
    onUpdateQuery: jest.fn(),
    resetSavedSearch: jest.fn(),
    savedSearch: savedSearchMock,
    savedSearchData$,
    savedSearchRefetch$: new Subject(),
    searchSource: searchSourceMock,
    stateContainer,
    setExpandedDoc: jest.fn(),
    persistDataView: jest.fn(),
    updateAdHocDataViewId: jest.fn(),
  };

  const component = mountWithIntl(
    <KibanaContextProvider services={services}>
      <DiscoverMainProvider value={stateContainer}>
        <DiscoverLayout {...props} />
      </DiscoverMainProvider>
    </KibanaContextProvider>,
    mountOptions
  );

  // DiscoverMainContent uses UnifiedHistogramLayout which
  // is lazy loaded, so we need to wait for it to be loaded
  await act(() => setTimeout(0));

  return component;
}

describe('Discover component', () => {
  test('selected data view without time field displays no chart toggle', async () => {
    const container = document.createElement('div');
    await mountComponent(dataViewMock, undefined, { attachTo: container });
    expect(
      container.querySelector('[data-test-subj="unifiedHistogramChartOptionsToggle"]')
    ).toBeNull();
  });

  test('selected data view with time field displays chart toggle', async () => {
    const container = document.createElement('div');
    await mountComponent(dataViewWithTimefieldMock, undefined, { attachTo: container });
    expect(
      container.querySelector('[data-test-subj="unifiedHistogramChartOptionsToggle"]')
    ).not.toBeNull();
  });

  test('sql query displays no chart toggle', async () => {
    const container = document.createElement('div');
    await mountComponent(
      dataViewWithTimefieldMock,
      false,
      { attachTo: container },
      { sql: 'SELECT * FROM test' },
      true
    );
    expect(
      container.querySelector('[data-test-subj="unifiedHistogramChartOptionsToggle"]')
    ).toBeNull();
  });

  test('the saved search title h1 gains focus on navigate', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const component = await mountComponent(dataViewWithTimefieldMock, undefined, {
      attachTo: container,
    });
    expect(
      component.find('[data-test-subj="discoverSavedSearchTitle"]').getDOMNode()
    ).toHaveFocus();
  });

  describe('sidebar', () => {
    test('should be opened if discover:sidebarClosed was not set', async () => {
      const component = await mountComponent(dataViewWithTimefieldMock, undefined);
      expect(component.find(DiscoverSidebar).length).toBe(1);
    });

    test('should be opened if discover:sidebarClosed is false', async () => {
      const component = await mountComponent(dataViewWithTimefieldMock, false);
      expect(component.find(DiscoverSidebar).length).toBe(1);
    });

    test('should be closed if discover:sidebarClosed is true', async () => {
      const component = await mountComponent(dataViewWithTimefieldMock, true);
      expect(component.find(DiscoverSidebar).length).toBe(0);
    });
  });
});
