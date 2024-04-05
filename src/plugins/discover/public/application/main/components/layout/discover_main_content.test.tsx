/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BehaviorSubject, of } from 'rxjs';
import { EuiHorizontalRule } from '@elastic/eui';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { DataView } from '@kbn/data-plugin/common';
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import {
  AvailableFields$,
  DataDocuments$,
  DataMain$,
  DataTotalHits$,
  RecordRawType,
} from '../../services/discover_data_state_container';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { FetchStatus, SidebarToggleState } from '../../../types';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { DiscoverMainContent, DiscoverMainContentProps } from './discover_main_content';
import { SavedSearch, VIEW_MODE } from '@kbn/saved-search-plugin/public';
import { DocumentViewModeToggle } from '../../../../components/view_mode_toggle';
import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { DiscoverDocuments } from './discover_documents';
import { FieldStatisticsTab } from '../field_stats_table';
import { DiscoverMainProvider } from '../../services/discover_state_provider';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { PanelsToggle } from '../../../../components/panels_toggle';
import type { Storage } from '@kbn/kibana-utils-plugin/public';

const mountComponent = async ({
  hideChart = false,
  isPlainRecord = false,
  isChartAvailable,
  viewMode = VIEW_MODE.DOCUMENT_LEVEL,
  storage,
}: {
  hideChart?: boolean;
  isPlainRecord?: boolean;
  isChartAvailable?: boolean;
  viewMode?: VIEW_MODE;
  storage?: Storage;
  savedSearch?: SavedSearch;
} = {}) => {
  let services = createDiscoverServicesMock();

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

  const stateContainer = getDiscoverStateMock({ isTimeBased: true });
  const savedSearchData$ = {
    main$,
    documents$,
    totalHits$,
    availableFields$,
  };
  stateContainer.dataState.data$ = savedSearchData$;
  const dataView = (await stateContainer.savedSearchState.getState().searchSource.getDataView())!;
  stateContainer.appState.update({
    index: dataView?.id!,
    interval: 'auto',
    hideChart,
    columns: [],
  });

  const props: DiscoverMainContentProps = {
    isPlainRecord,
    dataView,
    stateContainer,
    onFieldEdited: jest.fn(),
    columns: [],
    viewMode,
    onAddFilter: jest.fn(),
    isChartAvailable,
    panelsToggle: (
      <PanelsToggle
        stateContainer={stateContainer}
        sidebarToggleState$={
          new BehaviorSubject<SidebarToggleState>({
            isCollapsed: true,
            toggle: () => {},
          })
        }
        isChartAvailable={undefined}
        renderedFor="root"
      />
    ),
  };

  const component = mountWithIntl(
    <KibanaRenderContextProvider theme={services.core.theme} i18n={services.core.i18n}>
      <KibanaContextProvider services={services}>
        <DiscoverMainProvider value={stateContainer}>
          <DiscoverMainContent {...props} />
        </DiscoverMainProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );

  await act(async () => {
    component.update();
  });

  return component;
};

describe('Discover main content component', () => {
  describe('DocumentViewModeToggle', () => {
    it('should show DocumentViewModeToggle when isPlainRecord is false', async () => {
      const component = await mountComponent();
      expect(component.find(DiscoverDocuments).prop('viewModeToggle')).toBeDefined();
    });

    it('should include DocumentViewModeToggle when isPlainRecord is true', async () => {
      const component = await mountComponent({ isPlainRecord: true });
      expect(component.find(DiscoverDocuments).prop('viewModeToggle')).toBeDefined();
    });

    it('should show DocumentViewModeToggle for Field Statistics', async () => {
      const component = await mountComponent({ viewMode: VIEW_MODE.AGGREGATED_LEVEL });
      expect(component.find(DocumentViewModeToggle).exists()).toBe(true);
    });

    it('should include PanelsToggle when chart is available', async () => {
      const component = await mountComponent({ isChartAvailable: true });
      expect(component.find(PanelsToggle).prop('isChartAvailable')).toBe(true);
      expect(component.find(PanelsToggle).prop('renderedFor')).toBe('tabs');
      expect(component.find(EuiHorizontalRule).exists()).toBe(true);
    });

    it('should include PanelsToggle when chart is available and hidden', async () => {
      const component = await mountComponent({ isChartAvailable: true, hideChart: true });
      expect(component.find(PanelsToggle).prop('isChartAvailable')).toBe(true);
      expect(component.find(PanelsToggle).prop('renderedFor')).toBe('tabs');
      expect(component.find(EuiHorizontalRule).exists()).toBe(false);
    });

    it('should include PanelsToggle when chart is not available', async () => {
      const component = await mountComponent({ isChartAvailable: false });
      expect(component.find(PanelsToggle).prop('isChartAvailable')).toBe(false);
      expect(component.find(PanelsToggle).prop('renderedFor')).toBe('tabs');
      expect(component.find(EuiHorizontalRule).exists()).toBe(false);
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
