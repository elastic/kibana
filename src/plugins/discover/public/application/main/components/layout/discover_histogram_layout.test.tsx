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
import { esHits } from '../../../../__mocks__/es_hits';
import { dataViewMock } from '../../../../__mocks__/data_view';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import {
  AvailableFields$,
  DataDocuments$,
  DataMain$,
  DataTotalHits$,
  RecordRawType,
} from '../../services/discover_data_state_container';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { FetchStatus } from '../../../types';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { buildDataTableRecord } from '../../../../utils/build_data_record';
import { DiscoverHistogramLayout, DiscoverHistogramLayoutProps } from './discover_histogram_layout';
import { SavedSearch, VIEW_MODE } from '@kbn/saved-search-plugin/public';
import { CoreTheme } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { createSearchSessionMock } from '../../../../__mocks__/search_session';
import { RequestAdapter } from '@kbn/inspector-plugin/public';
import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { getSessionServiceMock } from '@kbn/data-plugin/public/search/session/mocks';
import { ResetSearchButton } from './reset_search_button';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverMainProvider } from '../../services/discover_state_provider';
import { act } from 'react-dom/test-utils';

function getStateContainer() {
  const stateContainer = getDiscoverStateMock({ isTimeBased: true });

  stateContainer.appState.update({
    interval: 'auto',
    hideChart: false,
  });

  return stateContainer;
}

const mountComponent = async ({
  isPlainRecord = false,
  storage,
  savedSearch = savedSearchMock,
  resetSavedSearch = jest.fn(),
  searchSessionId = '123',
}: {
  isPlainRecord?: boolean;
  isTimeBased?: boolean;
  storage?: Storage;
  savedSearch?: SavedSearch;
  resetSavedSearch?(): void;
  searchSessionId?: string | null;
} = {}) => {
  let services = discoverServiceMock;
  services.data.query.timefilter.timefilter.getAbsoluteTime = () => {
    return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
  };
  services.data.query.timefilter.timefilter.getTime = () => {
    return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
  };
  (services.data.query.queryString.getDefaultQuery as jest.Mock).mockReturnValue({
    language: 'kuery',
    query: '',
  });
  (searchSourceInstanceMock.fetch$ as jest.Mock).mockImplementation(
    jest.fn().mockReturnValue(of({ rawResponse: { hits: { total: 2 } } }))
  );

  if (storage) {
    services = { ...services, storage };
  }

  const main$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    recordRawType: isPlainRecord ? RecordRawType.PLAIN : RecordRawType.DOCUMENT,
    foundDocuments: true,
  }) as DataMain$;

  const documents$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: esHits.map((esHit) => buildDataTableRecord(esHit, dataViewMock)),
  }) as DataDocuments$;

  const availableFields$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    fields: [] as string[],
  }) as AvailableFields$;

  const totalHits$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: Number(esHits.length),
  }) as DataTotalHits$;

  const savedSearchData$ = {
    main$,
    documents$,
    totalHits$,
    availableFields$,
  };

  const session = getSessionServiceMock();

  session.getSession$.mockReturnValue(new BehaviorSubject(searchSessionId ?? undefined));

  const stateContainer = getStateContainer();
  stateContainer.dataState.data$ = savedSearchData$;

  const props: DiscoverHistogramLayoutProps = {
    isPlainRecord,
    dataView: dataViewMock,
    navigateTo: jest.fn(),
    setExpandedDoc: jest.fn(),
    savedSearch,
    stateContainer,
    onFieldEdited: jest.fn(),
    columns: [],
    viewMode: VIEW_MODE.DOCUMENT_LEVEL,
    onAddFilter: jest.fn(),
    resetSavedSearch,
    resizeRef: { current: null },
    inspectorAdapters: { requests: new RequestAdapter() },
  };
  stateContainer.searchSessionManager = createSearchSessionMock(session).searchSessionManager;

  const coreTheme$ = new BehaviorSubject<CoreTheme>({ darkMode: false });

  const component = mountWithIntl(
    <KibanaContextProvider services={services}>
      <KibanaThemeProvider theme$={coreTheme$}>
        <DiscoverMainProvider value={stateContainer}>
          <DiscoverHistogramLayout {...props} />
        </DiscoverMainProvider>
      </KibanaThemeProvider>
    </KibanaContextProvider>
  );

  // wait for lazy modules
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
  component.update();

  return component;
};

describe('Discover histogram layout component', () => {
  describe('render', () => {
    it('should render null if there is no search session', async () => {
      const component = await mountComponent({ searchSessionId: null });
      expect(component.isEmptyRender()).toBe(true);
    });

    it('should not render null if there is a search session', async () => {
      const component = await mountComponent();
      expect(component.isEmptyRender()).toBe(false);
    });

    it('should not render null if there is no search session, but isPlainRecord is true', async () => {
      const component = await mountComponent({ isPlainRecord: true });
      expect(component.isEmptyRender()).toBe(false);
    });
  });

  describe('reset search button', () => {
    it('renders the button when there is a saved search', async () => {
      const component = await mountComponent();
      expect(component.find(ResetSearchButton).exists()).toBe(true);
    });

    it('does not render the button when there is no saved search', async () => {
      const component = await mountComponent({
        savedSearch: { ...savedSearchMock, id: undefined },
      });
      expect(component.find(ResetSearchButton).exists()).toBe(false);
    });

    it('should call resetSavedSearch when clicked', async () => {
      const resetSavedSearch = jest.fn();
      const component = await mountComponent({ resetSavedSearch });
      component.find(ResetSearchButton).find('button').simulate('click');
      expect(resetSavedSearch).toHaveBeenCalled();
    });
  });
});
