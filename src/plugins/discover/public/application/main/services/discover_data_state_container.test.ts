/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Subject } from 'rxjs';
import { waitFor } from '@testing-library/react';
import { discoverServiceMock } from '../../../__mocks__/services';
import { savedSearchMockWithSQL } from '../../../__mocks__/saved_search';
import { getDiscoverStateContainer } from './discover_state';
import { FetchStatus } from '../../types';
import { setUrlTracker } from '../../../kibana_services';
import { urlTrackerMock } from '../../../__mocks__/url_tracker.mock';
import { RecordRawType } from './discover_data_state_container';
import { createBrowserHistory } from 'history';
import { getDiscoverStateMock } from '../../../__mocks__/discover_state.mock';

setUrlTracker(urlTrackerMock);
describe('test getDataStateContainer', () => {
  test('return is valid', async () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    const dataState = stateContainer.dataState;

    expect(dataState.refetch$).toBeInstanceOf(Subject);
    expect(dataState.data$.main$.getValue().fetchStatus).toBe(FetchStatus.LOADING);
    expect(dataState.data$.documents$.getValue().fetchStatus).toBe(FetchStatus.LOADING);
    expect(dataState.data$.totalHits$.getValue().fetchStatus).toBe(FetchStatus.LOADING);
  });
  test('refetch$ triggers a search', async () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });

    discoverServiceMock.data.query.timefilter.timefilter.getTime = jest.fn(() => {
      return { from: '2021-05-01T20:00:00Z', to: '2021-05-02T20:00:00Z' };
    });
    const dataState = stateContainer.dataState;

    const unsubscribe = dataState.subscribe();

    expect(dataState.data$.totalHits$.value.result).toBe(undefined);
    expect(dataState.data$.documents$.value.result).toEqual(undefined);

    dataState.refetch$.next(undefined);
    await waitFor(() => {
      expect(dataState.data$.main$.value.fetchStatus).toBe('complete');
    });

    expect(dataState.data$.totalHits$.value.result).toBe(0);
    expect(dataState.data$.documents$.value.result).toEqual([]);
    unsubscribe();
  });

  test('reset sets back to initial state', async () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });

    discoverServiceMock.data.query.timefilter.timefilter.getTime = jest.fn(() => {
      return { from: '2021-05-01T20:00:00Z', to: '2021-05-02T20:00:00Z' };
    });

    const dataState = stateContainer.dataState;
    const unsubscribe = dataState.subscribe();

    await waitFor(() => {
      expect(dataState.data$.main$.value.fetchStatus).toBe(FetchStatus.LOADING);
    });

    dataState.refetch$.next(undefined);

    await waitFor(() => {
      expect(dataState.data$.main$.value.fetchStatus).toBe(FetchStatus.COMPLETE);
    });
    dataState.reset();
    await waitFor(() => {
      expect(dataState.data$.main$.value.fetchStatus).toBe(FetchStatus.LOADING);
    });

    unsubscribe();
  });

  test('useSavedSearch returns plain record raw type', async () => {
    const history = createBrowserHistory();
    const stateContainer = getDiscoverStateContainer({
      savedSearch: savedSearchMockWithSQL,
      services: discoverServiceMock,
      history,
    });

    expect(stateContainer.dataState.data$.main$.getValue().recordRawType).toBe(RecordRawType.PLAIN);
  });
});
