/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BehaviorSubject, of } from 'rxjs';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { Query, AggregateQuery } from '@kbn/es-query';
import { setHeaderActionMenuMounter } from '../../../../kibana_services';
import { DiscoverLayout, SIDEBAR_CLOSED_KEY } from './discover_layout';
import { esHits } from '../../../../__mocks__/es_hits';
import { dataViewMock } from '../../../../__mocks__/data_view';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import {
  createSearchSourceMock,
  searchSourceInstanceMock,
} from '@kbn/data-plugin/common/search/search_source/mocks';
import type { DataView } from '@kbn/data-views-plugin/public';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import {
  AvailableFields$,
  DataDocuments$,
  DataMain$,
  DataTotalHits$,
  RecordRawType,
} from '../../services/discover_data_state_container';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { FetchStatus } from '../../../types';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { DiscoverSidebar } from '../sidebar/discover_sidebar';
import { LocalStorageMock } from '../../../../__mocks__/local_storage_mock';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { DiscoverServices } from '../../../../build_services';
import { buildDataTableRecord } from '../../../../utils/build_data_record';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { createSearchSessionMock } from '../../../../__mocks__/search_session';
import { getSessionServiceMock } from '@kbn/data-plugin/public/search/session/mocks';
import { DiscoverMainProvider } from '../../services/discover_state_provider';
import { act } from 'react-dom/test-utils';

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
    ...createDiscoverServicesMock(),
    storage: new LocalStorageMock({
      [SIDEBAR_CLOSED_KEY]: prevSidebarClosed,
    }) as unknown as Storage,
  } as unknown as DiscoverServices;
  const time = { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
  services.data.query.timefilter.timefilter.getTime = () => time;
  (services.data.query.queryString.getDefaultQuery as jest.Mock).mockReturnValue({
    language: 'kuery',
    query: '',
  });
  (services.data.query.getState as jest.Mock).mockReturnValue({
    filters: [],
    query,
    time,
  });
  (searchSourceInstanceMock.fetch$ as jest.Mock).mockImplementation(
    jest.fn().mockReturnValue(of({ rawResponse: { hits: { total: 2 } } }))
  );

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

  stateContainer.dataState.data$ = {
    main$,
    documents$,
    totalHits$,
    availableFields$,
  };

  const session = getSessionServiceMock();

  session.getSession$.mockReturnValue(new BehaviorSubject('123'));

  stateContainer.setAppState({ interval: 'auto', query });
  stateContainer.internalState.transitions.setDataView(dataView);

  const props = {
    dataView,
    inspectorAdapters: { requests: new RequestAdapter() },
    navigateTo: jest.fn(),
    onChangeDataView: jest.fn(),
    onUpdateQuery: jest.fn(),
    resetSavedSearch: jest.fn(),
    savedSearch: savedSearchMock,
    searchSource: searchSourceMock,
    state: { columns: [], query, hideChart: false, interval: 'auto' },
    stateContainer,
    setExpandedDoc: jest.fn(),
    persistDataView: jest.fn(),
    updateAdHocDataViewId: jest.fn(),
    searchSessionManager: createSearchSessionMock(session).searchSessionManager,
    updateDataViewList: jest.fn(),
  };

  const component = mountWithIntl(
    <KibanaContextProvider services={services}>
      <DiscoverMainProvider value={stateContainer}>
        <DiscoverLayout {...props} />
      </DiscoverMainProvider>
    </KibanaContextProvider>,
    mountOptions
  );

  // wait for lazy modules
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  component.update();

  return component;
}

describe('Discover component', () => {
  test('selected data view without time field displays no chart toggle', async () => {
    const container = document.createElement('div');
    await mountComponent(dataViewMock, undefined, { attachTo: container });
    expect(
      container.querySelector('[data-test-subj="unifiedHistogramChartOptionsToggle"]')
    ).toBeNull();
  }, 10000);

  test('selected data view with time field displays chart toggle', async () => {
    const container = document.createElement('div');
    await mountComponent(dataViewWithTimefieldMock, undefined, { attachTo: container });
    expect(
      container.querySelector('[data-test-subj="unifiedHistogramChartOptionsToggle"]')
    ).not.toBeNull();
  }, 10000);

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
  }, 10000);

  describe('sidebar', () => {
    test('should be opened if discover:sidebarClosed was not set', async () => {
      const component = await mountComponent(dataViewWithTimefieldMock, undefined);
      expect(component.find(DiscoverSidebar).length).toBe(1);
    }, 10000);

    test('should be opened if discover:sidebarClosed is false', async () => {
      const component = await mountComponent(dataViewWithTimefieldMock, false);
      expect(component.find(DiscoverSidebar).length).toBe(1);
    }, 10000);

    test('should be closed if discover:sidebarClosed is true', async () => {
      const component = await mountComponent(dataViewWithTimefieldMock, true);
      expect(component.find(DiscoverSidebar).length).toBe(0);
    }, 10000);
  });
});
