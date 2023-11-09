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
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
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
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { DiscoverHistogramLayout, DiscoverHistogramLayoutProps } from './discover_histogram_layout';
import { SavedSearch, VIEW_MODE } from '@kbn/saved-search-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { createSearchSessionMock } from '../../../../__mocks__/search_session';
import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { getSessionServiceMock } from '@kbn/data-plugin/public/search/session/mocks';
import { ResetSearchButton } from './reset_search_button';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverMainProvider } from '../../services/discover_state_provider';
import { act } from 'react-dom/test-utils';

function getStateContainer(savedSearch?: SavedSearch) {
  const stateContainer = getDiscoverStateMock({ isTimeBased: true, savedSearch });

  stateContainer.appState.update({
    interval: 'auto',
    hideChart: false,
  });

  stateContainer.internalState.transitions.setDataView(dataViewMock);

  return stateContainer;
}

const mountComponent = async ({
  isPlainRecord = false,
  storage,
  savedSearch = savedSearchMock,
  searchSessionId = '123',
}: {
  isPlainRecord?: boolean;
  isTimeBased?: boolean;
  storage?: Storage;
  savedSearch?: SavedSearch;
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
    result: esHitsMock.map((esHit) => buildDataTableRecord(esHit, dataViewMock)),
  }) as DataDocuments$;

  const availableFields$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    fields: [] as string[],
  }) as AvailableFields$;

  const totalHits$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: Number(esHitsMock.length),
  }) as DataTotalHits$;

  const savedSearchData$ = {
    main$,
    documents$,
    totalHits$,
    availableFields$,
  };

  const session = getSessionServiceMock();

  session.getSession$.mockReturnValue(new BehaviorSubject(searchSessionId ?? undefined));

  const stateContainer = getStateContainer(savedSearch);
  stateContainer.dataState.data$ = savedSearchData$;
  stateContainer.actions.undoSavedSearchChanges = jest.fn();

  const props: DiscoverHistogramLayoutProps = {
    isPlainRecord,
    dataView: dataViewMock,
    stateContainer,
    onFieldEdited: jest.fn(),
    columns: [],
    viewMode: VIEW_MODE.DOCUMENT_LEVEL,
    onAddFilter: jest.fn(),
    container: null,
  };
  stateContainer.searchSessionManager = createSearchSessionMock(session).searchSessionManager;

  const component = mountWithIntl(
    <KibanaRenderContextProvider theme={services.core.theme} i18n={services.core.i18n}>
      <KibanaContextProvider services={services}>
        <DiscoverMainProvider value={stateContainer}>
          <DiscoverHistogramLayout {...props} />
        </DiscoverMainProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );

  // wait for lazy modules
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
  await act(async () => {
    component.update();
  });

  return { component, stateContainer };
};

describe('Discover histogram layout component', () => {
  describe('render', () => {
    it('should render null if there is no search session', async () => {
      const { component } = await mountComponent({ searchSessionId: null });
      expect(component.isEmptyRender()).toBe(true);
    });

    it('should not render null if there is a search session', async () => {
      const { component } = await mountComponent();
      expect(component.isEmptyRender()).toBe(false);
    });

    it('should not render null if there is no search session, but isPlainRecord is true', async () => {
      const { component } = await mountComponent({ isPlainRecord: true });
      expect(component.isEmptyRender()).toBe(false);
    });
  });

  describe('reset search button', () => {
    it('renders the button when there is a saved search', async () => {
      const { component } = await mountComponent();
      expect(component.find(ResetSearchButton).exists()).toBe(true);
    });

    it('does not render the button when there is no saved search', async () => {
      const { component } = await mountComponent({
        savedSearch: { ...savedSearchMock, id: undefined },
      });
      expect(component.find(ResetSearchButton).exists()).toBe(false);
    });

    it('should call resetSavedSearch when clicked', async () => {
      const { component, stateContainer } = await mountComponent();
      expect(component.find(ResetSearchButton).exists()).toBe(true);
      component.find(ResetSearchButton).find('button').simulate('click');
      expect(stateContainer.actions.undoSavedSearchChanges).toHaveBeenCalled();
    });
  });
});
