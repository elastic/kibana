/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject, of } from 'rxjs';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { DataView } from '@kbn/data-views-plugin/common';
import { esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import { savedSearchMockWithTimeField } from '../../../../__mocks__/saved_search';
import type {
  DataDocuments$,
  DataMain$,
  DataTotalHits$,
} from '../../state_management/discover_data_state_container';
import { discoverServiceMock } from '../../../../__mocks__/services';
import type { SidebarToggleState } from '../../../types';
import { FetchStatus } from '../../../types';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { DiscoverHistogramLayout } from './discover_histogram_layout';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { VIEW_MODE } from '@kbn/saved-search-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { act } from 'react-dom/test-utils';
import { PanelsToggle } from '../../../../components/panels_toggle';
import { createDataViewDataSource } from '../../../../../common/data_sources';
import { internalStateActions } from '../../state_management/redux';
import { UnifiedHistogramChart } from '@kbn/unified-histogram';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';
import type { DiscoverMainContentProps } from './discover_main_content';

const mockSearchSessionId = '123';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useResizeObserver: jest.fn(() => ({ width: 1000, height: 1000 })),
}));

function getStateContainer({
  savedSearch,
  searchSessionId,
}: {
  savedSearch?: SavedSearch;
  searchSessionId?: string;
}) {
  const stateContainer = getDiscoverStateMock({ isTimeBased: true, savedSearch });
  const dataView = savedSearch?.searchSource?.getField('index') as DataView;
  const appState = {
    dataSource: createDataViewDataSource({ dataViewId: dataView?.id! }),
    interval: 'auto',
    hideChart: false,
  };

  stateContainer.appState.update(appState);

  stateContainer.internalState.dispatch(
    stateContainer.injectCurrentTab(internalStateActions.setDataView)({ dataView })
  );
  stateContainer.internalState.dispatch(
    stateContainer.injectCurrentTab(internalStateActions.setDataRequestParams)({
      dataRequestParams: {
        timeRangeAbsolute: {
          from: '2020-05-14T11:05:13.590',
          to: '2020-05-14T11:20:13.590',
        },
        timeRangeRelative: {
          from: '2020-05-14T11:05:13.590',
          to: '2020-05-14T11:20:13.590',
        },
        searchSessionId,
      },
    })
  );

  return stateContainer;
}

const mountComponent = async ({
  storage,
  savedSearch = savedSearchMockWithTimeField,
  noSearchSessionId,
}: {
  isTimeBased?: boolean;
  storage?: Storage;
  savedSearch?: SavedSearch;
  noSearchSessionId?: boolean;
} = {}) => {
  const dataView = savedSearch?.searchSource?.getField('index') as DataView;

  let services = discoverServiceMock;

  (searchSourceInstanceMock.fetch$ as jest.Mock).mockImplementation(
    jest.fn().mockReturnValue(of({ rawResponse: { hits: { total: 2 } } }))
  );

  if (storage) {
    services = { ...services, storage };
  }

  const main$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    foundDocuments: true,
  }) as DataMain$;

  const documents$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: esHitsMock.map((esHit) => buildDataTableRecord(esHit, dataView)),
  }) as DataDocuments$;

  const totalHits$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: Number(esHitsMock.length),
  }) as DataTotalHits$;

  const savedSearchData$ = {
    main$,
    documents$,
    totalHits$,
  };

  const stateContainer = getStateContainer({
    savedSearch,
    searchSessionId: noSearchSessionId ? undefined : mockSearchSessionId,
  });
  stateContainer.dataState.data$ = savedSearchData$;
  stateContainer.actions.undoSavedSearchChanges = jest.fn();

  const props: DiscoverMainContentProps = {
    dataView,
    stateContainer,
    onFieldEdited: jest.fn(),
    columns: [],
    viewMode: VIEW_MODE.DOCUMENT_LEVEL,
    onAddFilter: jest.fn(),
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
    <DiscoverTestProvider
      services={services}
      stateContainer={stateContainer}
      runtimeState={{ currentDataView: dataView, adHocDataViews: [] }}
      usePortalsRenderer
    >
      <DiscoverHistogramLayout {...props} />
    </DiscoverTestProvider>
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
    it('should not render chart if there is no search session', async () => {
      const { component } = await mountComponent({ noSearchSessionId: true });
      expect(component.exists(UnifiedHistogramChart)).toBe(false);
    });

    it('should render chart if there is a search session', async () => {
      const { component } = await mountComponent();
      expect(component.exists(UnifiedHistogramChart)).toBe(true);
    }, 10000);

    it('should render PanelsToggle', async () => {
      const { component } = await mountComponent();
      expect(component.find(PanelsToggle).first().prop('isChartAvailable')).toBe(undefined);
      expect(component.find(PanelsToggle).first().prop('renderedFor')).toBe('histogram');
      expect(component.find(PanelsToggle).last().prop('isChartAvailable')).toBe(true);
      expect(component.find(PanelsToggle).last().prop('renderedFor')).toBe('tabs');
    });
  });
});
