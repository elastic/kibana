/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Subject, BehaviorSubject } from 'rxjs';
import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';
import { esHits } from '../../../../__mocks__/es_hits';
import { dataViewMock } from '../../../../__mocks__/data_view';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
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
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import {
  UnifiedHistogramChartData,
  UnifiedHistogramLayout,
} from '@kbn/unified-histogram-plugin/public';
import { HISTOGRAM_HEIGHT_KEY } from './use_discover_histogram';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
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
  const stateContainer = getDiscoverStateMock({ isTimeBased });
  stateContainer.setAppState({
    interval: 'auto',
    hideChart,
    columns: [],
  });

  const props: DiscoverMainContentProps = {
    isPlainRecord,
    dataView: dataViewMock,
    navigateTo: jest.fn(),
    resetSavedSearch,
    setExpandedDoc: jest.fn(),
    savedSearch,
    savedSearchData$,
    savedSearchRefetch$: new Subject(),
    stateContainer,
    isTimeBased,
    viewMode: VIEW_MODE.DOCUMENT_LEVEL,
    onAddFilter: jest.fn(),
    onFieldEdited: jest.fn(),
    columns: [],
    resizeRef: { current: null },
  };

  const coreTheme$ = new BehaviorSubject<CoreTheme>({ darkMode: false });

  const component = mountWithIntl(
    <KibanaContextProvider services={services}>
      <KibanaThemeProvider theme$={coreTheme$}>
        <DiscoverMainProvider value={stateContainer}>
          <DiscoverMainContent {...props} />
        </DiscoverMainProvider>
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
