/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Subject, BehaviorSubject, of } from 'rxjs';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { esHits } from '../../../../__mocks__/es_hits';
import { dataViewMock } from '../../../../__mocks__/data_view';
import { GetStateReturn } from '../../services/discover_state';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import {
  AvailableFields$,
  DataDocuments$,
  DataMain$,
  DataTotalHits$,
  RecordRawType,
} from '../../hooks/use_saved_search';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { FetchStatus } from '../../../types';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { buildDataTableRecord } from '../../../../utils/build_data_record';
import { DiscoverMainContent, DiscoverMainContentProps } from './discover_main_content';
import { VIEW_MODE } from '@kbn/saved-search-plugin/public';
import { CoreTheme } from '@kbn/core/public';
import { act } from 'react-dom/test-utils';
import { setTimeout } from 'timers/promises';
import { DocumentViewModeToggle } from '../../../../components/view_mode_toggle';
import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { DiscoverDocuments } from './discover_documents';
import { FieldStatisticsTab } from '../field_stats_table';

const mountComponent = async ({
  isPlainRecord = false,
  viewMode = VIEW_MODE.DOCUMENT_LEVEL,
}: {
  isPlainRecord?: boolean;
  viewMode?: VIEW_MODE;
} = {}) => {
  const services = createDiscoverServicesMock();

  (services.data.query.queryString.getDefaultQuery as jest.Mock).mockReturnValue({
    language: 'kuery',
    query: '',
  });
  (searchSourceInstanceMock.fetch$ as jest.Mock).mockImplementation(
    jest.fn().mockReturnValue(of({ rawResponse: { hits: { total: 2 } } }))
  );

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
    setExpandedDoc: jest.fn(),
    savedSearch: savedSearchMock,
    savedSearchData$,
    savedSearchRefetch$: new Subject(),
    state: { columns: [], hideChart: false },
    stateContainer: {
      setAppState: () => {},
      appStateContainer: {
        getState: () => ({
          interval: 'auto',
        }),
      },
    } as unknown as GetStateReturn,
    onFieldEdited: jest.fn(),
    columns: [],
    viewMode,
    onAddFilter: jest.fn(),
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
  component.update();

  return component;
};

describe('Discover main content component', () => {
  describe('DocumentViewModeToggle', () => {
    it('should show DocumentViewModeToggle when isPlainRecord is false', async () => {
      const component = await mountComponent();
      expect(component.find(DocumentViewModeToggle).exists()).toBe(true);
    });

    it('should not show DocumentViewModeToggle when isPlainRecord is true', async () => {
      const component = await mountComponent({ isPlainRecord: true });
      expect(component.find(DocumentViewModeToggle).exists()).toBe(false);
    });
  });

  describe('Document view', () => {
    it('should show DiscoverDocuments when VIEW_MODE is DOCUMENT_LEVEL', async () => {
      const component = await mountComponent();
      expect(component.find(DiscoverDocuments).exists()).toBe(true);
      expect(component.find(FieldStatisticsTab).exists()).toBe(false);
    });

    it('should show FieldStatisticsTableMemoized when VIEW_MODE is not DOCUMENT_LEVEL', async () => {
      const component = await mountComponent({ viewMode: VIEW_MODE.AGGREGATED_LEVEL });
      expect(component.find(DiscoverDocuments).exists()).toBe(false);
      expect(component.find(FieldStatisticsTab).exists()).toBe(true);
    });
  });
});
