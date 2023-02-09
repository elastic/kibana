/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { setHeaderActionMenuMounter } from '../../../../kibana_services';
import { esHits } from '../../../../__mocks__/es_hits';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { DiscoverStateContainer } from '../../services/discover_state';
import { DataDocuments$ } from '../../services/discover_data_state_container';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { FetchStatus } from '../../../types';
import { DiscoverDocuments, onResize } from './discover_documents';
import { dataViewMock } from '../../../../__mocks__/data_view';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { buildDataTableRecord } from '../../../../utils/build_data_record';
import { EsHitRecord } from '../../../../types';
import { DiscoverMainProvider } from '../../services/discover_state_provider';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { AppState } from '../../services/discover_app_state_container';

setHeaderActionMenuMounter(jest.fn());

function mountComponent(fetchStatus: FetchStatus, hits: EsHitRecord[]) {
  const services = discoverServiceMock;
  services.data.query.timefilter.timefilter.getTime = () => {
    return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
  };

  const documents$ = new BehaviorSubject({
    fetchStatus,
    result: hits.map((hit) => buildDataTableRecord(hit, dataViewMock)),
  }) as DataDocuments$;
  const stateContainer = getDiscoverStateMock({});
  stateContainer.setAppState({ index: dataViewMock.id });
  stateContainer.dataState.data$.documents$ = documents$;

  const props = {
    expandedDoc: undefined,
    dataView: dataViewMock,
    onAddFilter: jest.fn(),
    savedSearch: savedSearchMock,
    searchSource: savedSearchMock.searchSource,
    setExpandedDoc: jest.fn(),
    state: { columns: [] },
    stateContainer,
    navigateTo: jest.fn(),
    onFieldEdited: jest.fn(),
  };

  return mountWithIntl(
    <KibanaContextProvider services={services}>
      <DiscoverMainProvider value={stateContainer}>
        <DiscoverDocuments {...props} />
      </DiscoverMainProvider>
    </KibanaContextProvider>
  );
}

describe('Discover documents layout', () => {
  test('render loading when loading and no documents', () => {
    const component = mountComponent(FetchStatus.LOADING, []);
    expect(component.find('.dscDocuments__loading').exists()).toBeTruthy();
    expect(component.find('.dscTable').exists()).toBeFalsy();
  });

  test('render complete when loading but documents were already fetched', () => {
    const component = mountComponent(FetchStatus.LOADING, esHits);
    expect(component.find('.dscDocuments__loading').exists()).toBeFalsy();
    expect(component.find('.dscTable').exists()).toBeTruthy();
  });

  test('render complete', () => {
    const component = mountComponent(FetchStatus.COMPLETE, esHits);
    expect(component.find('.dscDocuments__loading').exists()).toBeFalsy();
    expect(component.find('.dscTable').exists()).toBeTruthy();
  });

  test('should set rounded width to state on resize column', () => {
    let state = {
      grid: { columns: { timestamp: { width: 173 }, someField: { width: 197 } } },
    } as AppState;
    const stateContainer = {
      setAppState: (newState: Partial<AppState>) => {
        state = { ...state, ...newState };
      },
      appState: {
        getState: () => state,
      },
    } as unknown as DiscoverStateContainer;

    onResize(
      {
        columnId: 'someField',
        width: 205.5435345534,
      },
      stateContainer
    );

    expect(state.grid?.columns?.someField.width).toEqual(206);
  });
});
