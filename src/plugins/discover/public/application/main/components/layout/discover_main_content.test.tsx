/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Subject, BehaviorSubject, of } from 'rxjs';
import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';
import { esHits } from '../../../../__mocks__/es_hits';
import { dataViewMock } from '../../../../__mocks__/data_view';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { GetStateReturn } from '../../services/discover_state';
import {
  AvailableFields$,
  DataDocuments$,
  DataMain$,
  DataTotalHits$,
  RecordRawType,
} from '../../hooks/use_saved_search';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { FetchStatus } from '../../../types';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { buildDataTableRecord } from '../../../../utils/build_data_record';
import { DiscoverMainContent, DiscoverMainContentProps } from './discover_main_content';
import { SavedSearch, VIEW_MODE } from '@kbn/saved-search-plugin/public';
import { CoreTheme } from '@kbn/core/public';
import { act } from 'react-dom/test-utils';
import { setTimeout } from 'timers/promises';
import { DocumentViewModeToggle } from '../../../../components/view_mode_toggle';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { LocalStorageMock } from '../../../../__mocks__/local_storage_mock';
import { UnifiedHistogramLayout } from '@kbn/unified-histogram-plugin/public';
import { HISTOGRAM_HEIGHT_KEY } from './use_discover_histogram';
import { createSearchSessionMock } from '../../../../__mocks__/search_session';
import { RequestAdapter } from '@kbn/inspector-plugin/public';
import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';

const mountComponent = async ({
  isPlainRecord = false,
  hideChart = false,
  isTimeBased = true,
  storage,
  savedSearch = savedSearchMock,
  resetSavedSearch = jest.fn(),
}: {
  isPlainRecord?: boolean;
  hideChart?: boolean;
  isTimeBased?: boolean;
  storage?: Storage;
  savedSearch?: SavedSearch;
  resetSavedSearch?: () => void;
} = {}) => {
  let services = discoverServiceMock;
  services.data.query.timefilter.timefilter.getAbsoluteTime = () => {
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

  const props: DiscoverMainContentProps = {
    isPlainRecord,
    dataView: dataViewMock,
    navigateTo: jest.fn(),
    resetSavedSearch,
    setExpandedDoc: jest.fn(),
    savedSearch,
    savedSearchData$,
    savedSearchRefetch$: new Subject(),
    state: { columns: [], hideChart },
    stateContainer: {
      setAppState: () => {},
      appStateContainer: {
        getState: () => ({
          interval: 'auto',
        }),
      },
    } as unknown as GetStateReturn,
    isTimeBased,
    viewMode: VIEW_MODE.DOCUMENT_LEVEL,
    onAddFilter: jest.fn(),
    onFieldEdited: jest.fn(),
    columns: [],
    resizeRef: { current: null },
    searchSessionManager: createSearchSessionMock().searchSessionManager,
    inspectorAdapters: { requests: new RequestAdapter() },
  };

  const coreTheme$ = new BehaviorSubject<CoreTheme>({ darkMode: false });

  const component = mountWithIntl(
    <KibanaContextProvider services={services}>
      <KibanaThemeProvider theme$={coreTheme$}>
        <DiscoverMainContent {...props} />
      </KibanaThemeProvider>
    </KibanaContextProvider>
  );

  // DiscoverMainContent uses UnifiedHistogramLayout which
  // is lazy loaded, so we need to wait for it to be loaded
  await act(() => setTimeout(0));

  return component;
};

describe('Discover main content component', () => {
  describe('DocumentViewModeToggle', () => {
    it('should show DocumentViewModeToggle when isPlainRecord is false', async () => {
      const component = await mountComponent();
      component.update();
      expect(component.find(DocumentViewModeToggle).exists()).toBe(true);
    });

    it('should not show DocumentViewModeToggle when isPlainRecord is true', async () => {
      const component = await mountComponent({ isPlainRecord: true });
      component.update();
      expect(component.find(DocumentViewModeToggle).exists()).toBe(false);
    });
  });

  describe('topPanelHeight persistence', () => {
    it('should try to get the initial topPanelHeight for UnifiedHistogramLayout from storage', async () => {
      const storage = new LocalStorageMock({}) as unknown as Storage;
      const originalGet = storage.get;
      storage.get = jest.fn().mockImplementation(originalGet);
      await mountComponent({ storage });
      expect(storage.get).toHaveBeenCalledWith(HISTOGRAM_HEIGHT_KEY);
    });

    it('should pass undefined to UnifiedHistogramLayout if no value is found in storage', async () => {
      const storage = new LocalStorageMock({}) as unknown as Storage;
      const originalGet = storage.get;
      storage.get = jest.fn().mockImplementation(originalGet);
      const component = await mountComponent({ storage });
      expect(storage.get).toHaveBeenCalledWith(HISTOGRAM_HEIGHT_KEY);
      expect(storage.get).toHaveReturnedWith(null);
      expect(component.find(UnifiedHistogramLayout).prop('topPanelHeight')).toBe(undefined);
    });

    it('should pass the stored topPanelHeight to UnifiedHistogramLayout if a value is found in storage', async () => {
      const storage = new LocalStorageMock({}) as unknown as Storage;
      const topPanelHeight = 123;
      storage.get = jest.fn().mockImplementation(() => topPanelHeight);
      const component = await mountComponent({ storage });
      expect(storage.get).toHaveBeenCalledWith(HISTOGRAM_HEIGHT_KEY);
      expect(storage.get).toHaveReturnedWith(topPanelHeight);
      expect(component.find(UnifiedHistogramLayout).prop('topPanelHeight')).toBe(topPanelHeight);
    });

    it('should update the topPanelHeight in storage and pass the new value to UnifiedHistogramLayout when the topPanelHeight changes', async () => {
      const storage = new LocalStorageMock({}) as unknown as Storage;
      const originalSet = storage.set;
      storage.set = jest.fn().mockImplementation(originalSet);
      const component = await mountComponent({ storage });
      const newTopPanelHeight = 123;
      expect(component.find(UnifiedHistogramLayout).prop('topPanelHeight')).not.toBe(
        newTopPanelHeight
      );
      act(() => {
        component.find(UnifiedHistogramLayout).prop('onTopPanelHeightChange')!(newTopPanelHeight);
      });
      component.update();
      expect(storage.set).toHaveBeenCalledWith(HISTOGRAM_HEIGHT_KEY, newTopPanelHeight);
      expect(component.find(UnifiedHistogramLayout).prop('topPanelHeight')).toBe(newTopPanelHeight);
    });
  });

  describe('reset search button', () => {
    it('renders the button when there is a saved search', async () => {
      const component = await mountComponent();
      expect(findTestSubject(component, 'resetSavedSearch').length).toBe(1);
    });

    it('does not render the button when there is no saved search', async () => {
      const component = await mountComponent({
        savedSearch: { ...savedSearchMock, id: undefined },
      });
      expect(findTestSubject(component, 'resetSavedSearch').length).toBe(0);
    });

    it('should call resetSavedSearch when clicked', async () => {
      const resetSavedSearch = jest.fn();
      const component = await mountComponent({ resetSavedSearch });
      findTestSubject(component, 'resetSavedSearch').simulate('click');
      expect(resetSavedSearch).toHaveBeenCalled();
    });
  });
});
