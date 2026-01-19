/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject, of, ReplaySubject } from 'rxjs';
import { EuiPageSidebar } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { Query, AggregateQuery } from '@kbn/es-query';
import { DiscoverLayout } from './discover_layout';
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import {
  createSearchSourceMock,
  searchSourceInstanceMock,
} from '@kbn/data-plugin/common/search/search_source/mocks';
import type { DataView } from '@kbn/data-views-plugin/public';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import type {
  DataDocuments$,
  DataMain$,
  DataTotalHits$,
  DiscoverLatestFetchDetails,
} from '../../state_management/discover_data_state_container';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { FetchStatus } from '../../../types';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { getSessionServiceMock } from '@kbn/data-plugin/public/search/session/mocks';
import { act } from 'react-dom/test-utils';
import { ErrorCallout } from '../../../../components/common/error_callout';
import { PanelsToggle } from '../../../../components/panels_toggle';
import { createDataViewDataSource } from '../../../../../common/data_sources';
import { internalStateActions } from '../../state_management/redux';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useResizeObserver: jest.fn(() => ({ width: 1000, height: 1000 })),
}));

async function mountComponent(
  dataView: DataView,
  prevSidebarClosed?: boolean,
  mountOptions: { attachTo?: HTMLElement } = {},
  query?: Query | AggregateQuery,
  main$: DataMain$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    foundDocuments: true,
  }) as DataMain$
) {
  const searchSourceMock = createSearchSourceMock({ index: dataView });
  const services = createDiscoverServicesMock();
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

  if (typeof prevSidebarClosed === 'boolean') {
    localStorage.setItem('discover:sidebarClosed', String(prevSidebarClosed));
  }

  const stateContainer = getDiscoverStateMock({ isTimeBased: true });

  const fetchChart$ = new ReplaySubject<DiscoverLatestFetchDetails>(1);
  fetchChart$.next({});
  stateContainer.dataState.fetchChart$ = fetchChart$;

  const documents$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: esHitsMock.map((esHit) => buildDataTableRecord(esHit, dataView)),
  }) as DataDocuments$;

  const totalHits$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: Number(esHitsMock.length),
  }) as DataTotalHits$;

  stateContainer.dataState.data$ = {
    main$,
    documents$,
    totalHits$,
  };

  const session = getSessionServiceMock();

  session.getSession$.mockReturnValue(new BehaviorSubject('123'));

  stateContainer.internalState.dispatch(
    stateContainer.injectCurrentTab(internalStateActions.updateAppState)({
      appState: {
        dataSource: createDataViewDataSource({ dataViewId: dataView.id! }),
        interval: 'auto',
        query,
      },
    })
  );
  stateContainer.internalState.dispatch(
    stateContainer.injectCurrentTab(internalStateActions.setDataView)({ dataView })
  );
  stateContainer.internalState.dispatch(
    stateContainer.injectCurrentTab(internalStateActions.setDataRequestParams)({
      dataRequestParams: {
        timeRangeAbsolute: time,
        timeRangeRelative: time,
        searchSessionId: '123',
        isSearchSessionRestored: false,
      },
    })
  );

  const props = {
    dataView,
    inspectorAdapters: { requests: new RequestAdapter() },
    navigateTo: jest.fn(),
    onChangeDataView: jest.fn(),
    savedSearch: savedSearchMock,
    searchSource: searchSourceMock,
    state: { columns: [], query, hideChart: false, interval: 'auto' },
    stateContainer,
    setExpandedDoc: jest.fn(),
    updateDataViewList: jest.fn(),
  };

  const component = mountWithIntl(
    <DiscoverTestProvider
      services={services}
      stateContainer={stateContainer}
      runtimeState={{ currentDataView: dataView, adHocDataViews: [] }}
      usePortalsRenderer
    >
      <DiscoverLayout {...props} />
    </DiscoverTestProvider>,
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
    expect(container.querySelector('[data-test-subj="dscHideHistogramButton"]')).toBeNull();
    expect(container.querySelector('[data-test-subj="dscShowHistogramButton"]')).toBeNull();
  }, 10000);

  test('selected data view with time field displays chart toggle', async () => {
    const container = document.createElement('div');
    await mountComponent(dataViewWithTimefieldMock, undefined, { attachTo: container });
    expect(container.querySelector('[data-test-subj="dscHideHistogramButton"]')).not.toBeNull();
    expect(container.querySelector('[data-test-subj="dscShowHistogramButton"]')).toBeNull();
  }, 10000);

  describe('sidebar', () => {
    test('should be opened if discover:sidebarClosed was not set', async () => {
      const component = await mountComponent(dataViewWithTimefieldMock, undefined);
      expect(component.find(EuiPageSidebar).length).toBe(1);
    }, 10000);

    test('should be opened if discover:sidebarClosed is false', async () => {
      const component = await mountComponent(dataViewWithTimefieldMock, false);
      expect(component.find(EuiPageSidebar).length).toBe(1);
    }, 10000);

    test('should be closed if discover:sidebarClosed is true', async () => {
      const component = await mountComponent(dataViewWithTimefieldMock, true);
      expect(component.find(EuiPageSidebar).length).toBe(0);
    }, 10000);
  });

  it('shows the no results error display', async () => {
    const component = await mountComponent(
      dataViewWithTimefieldMock,
      undefined,
      undefined,
      undefined,
      new BehaviorSubject({
        fetchStatus: FetchStatus.ERROR,
        foundDocuments: false,
        error: new Error('No results'),
      }) as DataMain$
    );
    expect(component.find(ErrorCallout)).toHaveLength(1);
    expect(component.find(PanelsToggle).prop('isChartAvailable')).toBe(false);
    expect(component.find(PanelsToggle).prop('renderedFor')).toBe('prompt');
  }, 10000);
});
