/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Subject } from 'rxjs';
import { waitFor } from '@testing-library/react';
import { createSearchSessionMock } from '../../../__mocks__/search_session';
import { discoverServiceMock } from '../../../__mocks__/services';
import { savedSearchMock, savedSearchMockWithSQL } from '../../../__mocks__/saved_search';
import { getDiscoverStateContainer } from './discover_state';
import { FetchStatus } from '../../types';
import { setUrlTracker } from '../../../kibana_services';
import { urlTrackerMock } from '../../../__mocks__/url_tracker.mock';
import { getDataStateContainer, RecordRawType } from './discover_data_state_container';

setUrlTracker(urlTrackerMock);
describe('test getDataStateContainer', () => {
  test('return is valid', async () => {
    const { history, searchSessionManager } = createSearchSessionMock();
    const stateContainer = getDiscoverStateContainer({
      savedSearch: savedSearchMock,
      services: discoverServiceMock,
      history,
    });

    const dataState = getDataStateContainer({
      getSavedSearch: () => savedSearchMock,
      searchSessionManager,
      services: discoverServiceMock,
      getAppState: () => stateContainer.appState.getState(),
    });

    expect(dataState.refetch$).toBeInstanceOf(Subject);
    expect(dataState.data$.main$.getValue().fetchStatus).toBe(FetchStatus.LOADING);
    expect(dataState.data$.documents$.getValue().fetchStatus).toBe(FetchStatus.LOADING);
    expect(dataState.data$.totalHits$.getValue().fetchStatus).toBe(FetchStatus.LOADING);
    expect(dataState.data$.charts$.getValue().fetchStatus).toBe(FetchStatus.LOADING);
  });
  test('refetch$ triggers a search', async () => {
    const { history, searchSessionManager } = createSearchSessionMock();
    const stateContainer = getDiscoverStateContainer({
      savedSearch: savedSearchMock,
      services: discoverServiceMock,
      history,
    });

    discoverServiceMock.data.query.timefilter.timefilter.getTime = jest.fn(() => {
      return { from: '2021-05-01T20:00:00Z', to: '2021-05-02T20:00:00Z' };
    });

    const dataState = getDataStateContainer({
      getSavedSearch: () => savedSearchMock,
      searchSessionManager,
      services: discoverServiceMock,
      getAppState: () => stateContainer.appState.getState(),
    });
    const unsubscribe = dataState.subscribe();

    dataState.refetch$.next(undefined);
    await waitFor(() => {
      expect(dataState.data$.main$.value.fetchStatus).toBe('complete');
    });

    expect(dataState.data$.totalHits$.value.result).toBe(0);
    expect(dataState.data$.documents$.value.result).toEqual([]);
    unsubscribe();
  });

  test('reset sets back to initial state', async () => {
    const { history, searchSessionManager } = createSearchSessionMock();
    const stateContainer = getDiscoverStateContainer({
      savedSearch: savedSearchMock,
      services: discoverServiceMock,
      history,
    });

    discoverServiceMock.data.query.timefilter.timefilter.getTime = jest.fn(() => {
      return { from: '2021-05-01T20:00:00Z', to: '2021-05-02T20:00:00Z' };
    });

    const dataState = getDataStateContainer({
      getSavedSearch: () => savedSearchMock,
      searchSessionManager,
      services: discoverServiceMock,
      getAppState: () => stateContainer.appState.getState(),
    });
    const unsubscribe = dataState.subscribe();

    dataState.refetch$.next(undefined);

    await waitFor(() => {
      expect(dataState.data$.main$.value.fetchStatus).toBe(FetchStatus.COMPLETE);
    });
    dataState.refetch$.next('reset');

    await waitFor(() => {
      expect(dataState.data$.main$.value.fetchStatus).toBe(FetchStatus.LOADING);
    });
    unsubscribe();
  });

  test('useSavedSearch returns plain record raw type', async () => {
    const { history } = createSearchSessionMock();
    const stateContainer = getDiscoverStateContainer({
      savedSearch: savedSearchMockWithSQL,
      services: discoverServiceMock,
      history,
    });

    expect(stateContainer.dataState.data$.main$.getValue().recordRawType).toBe(RecordRawType.PLAIN);
  });
});
