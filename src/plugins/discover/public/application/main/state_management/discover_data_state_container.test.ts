/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subject } from 'rxjs';
import { waitFor } from '@testing-library/react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock, esHitsMockWithSort } from '@kbn/discover-utils/src/__mocks__';
import { discoverServiceMock } from '../../../__mocks__/services';
import { FetchStatus } from '../../types';
import { DataDocuments$ } from './discover_data_state_container';
import { getDiscoverStateMock } from '../../../__mocks__/discover_state.mock';
import { fetchDocuments } from '../data_fetching/fetch_documents';
import { omit } from 'lodash';

jest.mock('../data_fetching/fetch_documents', () => ({
  fetchDocuments: jest.fn().mockResolvedValue({ records: [] }),
}));

jest.mock('@kbn/ebt-tools', () => ({
  reportPerformanceMetricEvent: jest.fn(),
}));

const mockFetchDocuments = fetchDocuments as unknown as jest.MockedFunction<typeof fetchDocuments>;

describe('test getDataStateContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
    jest.spyOn(stateContainer.searchSessionManager, 'getNextSearchSessionId');
    jest.spyOn(stateContainer.searchSessionManager, 'getCurrentSearchSessionId');
    expect(
      stateContainer.searchSessionManager.getNextSearchSessionId as jest.Mock
    ).not.toHaveBeenCalled();

    discoverServiceMock.data.query.timefilter.timefilter.getTime = jest.fn(() => {
      return { from: '2021-05-01T20:00:00Z', to: '2021-05-02T20:00:00Z' };
    });

    const dataState = stateContainer.dataState;
    const unsubscribe = dataState.subscribe();
    const resolveDataSourceProfileSpy = jest.spyOn(
      discoverServiceMock.profilesManager,
      'resolveDataSourceProfile'
    );

    expect(resolveDataSourceProfileSpy).not.toHaveBeenCalled();
    expect(dataState.data$.totalHits$.value.result).toBe(undefined);
    expect(dataState.data$.documents$.value.result).toEqual(undefined);

    dataState.refetch$.next(undefined);
    await waitFor(() => {
      expect(dataState.data$.main$.value.fetchStatus).toBe('complete');
    });

    expect(resolveDataSourceProfileSpy).toHaveBeenCalledTimes(1);
    expect(resolveDataSourceProfileSpy).toHaveBeenCalledWith({
      dataSource: stateContainer.appState.get().dataSource,
      dataView: stateContainer.savedSearchState.getState().searchSource.getField('index'),
      query: stateContainer.appState.get().query,
    });
    expect(dataState.data$.totalHits$.value.result).toBe(0);
    expect(dataState.data$.documents$.value.result).toEqual([]);

    // gets a new search session id
    expect(
      stateContainer.searchSessionManager.getNextSearchSessionId as jest.Mock
    ).toHaveBeenCalled();
    expect(
      stateContainer.searchSessionManager.getCurrentSearchSessionId as jest.Mock
    ).not.toHaveBeenCalled();

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

  test('refetch$ accepts "fetch_more" signal', (done) => {
    const records = esHitsMockWithSort.map((hit) => buildDataTableRecord(hit, dataViewMock));
    const initialRecords = [records[0], records[1]];
    const moreRecords = [records[2], records[3]];

    mockFetchDocuments.mockResolvedValue({ records: moreRecords });

    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.dataState.data$.documents$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: initialRecords,
    }) as DataDocuments$;

    jest.spyOn(stateContainer.searchSessionManager, 'getCurrentSearchSessionId');
    expect(
      stateContainer.searchSessionManager.getCurrentSearchSessionId as jest.Mock
    ).not.toHaveBeenCalled();

    const dataState = stateContainer.dataState;
    const unsubscribe = dataState.subscribe();
    const resolveDataSourceProfileSpy = jest.spyOn(
      discoverServiceMock.profilesManager,
      'resolveDataSourceProfile'
    );

    expect(resolveDataSourceProfileSpy).not.toHaveBeenCalled();
    expect(dataState.data$.documents$.value.result).toEqual(initialRecords);

    let hasLoadingMoreStarted = false;

    stateContainer.dataState.data$.documents$.subscribe((value) => {
      if (value.fetchStatus === FetchStatus.LOADING_MORE) {
        hasLoadingMoreStarted = true;
        return;
      }

      if (hasLoadingMoreStarted && value.fetchStatus === FetchStatus.COMPLETE) {
        expect(resolveDataSourceProfileSpy).not.toHaveBeenCalled();
        expect(value.result).toEqual([...initialRecords, ...moreRecords]);
        // it uses the same current search session id
        expect(
          stateContainer.searchSessionManager.getCurrentSearchSessionId as jest.Mock
        ).toHaveBeenCalled();
        unsubscribe();
        done();
      }
    });

    dataState.refetch$.next('fetch_more');
  });

  it('should update app state from default profile state', async () => {
    mockFetchDocuments.mockResolvedValue({ records: [] });
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    const dataState = stateContainer.dataState;
    const dataUnsub = dataState.subscribe();
    const appUnsub = stateContainer.appState.initAndSync();
    await discoverServiceMock.profilesManager.resolveDataSourceProfile({});
    stateContainer.actions.setDataView(dataViewMock);
    stateContainer.internalState.transitions.setResetDefaultProfileState({
      columns: true,
      rowHeight: true,
      breakdownField: true,
    });

    dataState.data$.totalHits$.next({
      fetchStatus: FetchStatus.COMPLETE,
      result: 0,
    });
    dataState.refetch$.next(undefined);

    await waitFor(() => {
      expect(dataState.data$.main$.value.fetchStatus).toBe(FetchStatus.COMPLETE);
    });
    expect(omit(stateContainer.internalState.get().resetDefaultProfileState, 'resetId')).toEqual({
      columns: false,
      rowHeight: false,
      breakdownField: false,
    });
    expect(stateContainer.appState.get().columns).toEqual(['message', 'extension']);
    expect(stateContainer.appState.get().rowHeight).toEqual(3);
    dataUnsub();
    appUnsub();
  });

  it('should not update app state from default profile state', async () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    const dataState = stateContainer.dataState;
    const dataUnsub = dataState.subscribe();
    const appUnsub = stateContainer.appState.initAndSync();
    await discoverServiceMock.profilesManager.resolveDataSourceProfile({});
    stateContainer.actions.setDataView(dataViewMock);
    stateContainer.internalState.transitions.setResetDefaultProfileState({
      columns: false,
      rowHeight: false,
      breakdownField: false,
    });
    dataState.data$.totalHits$.next({
      fetchStatus: FetchStatus.COMPLETE,
      result: 0,
    });
    dataState.refetch$.next(undefined);
    await waitFor(() => {
      expect(dataState.data$.main$.value.fetchStatus).toBe(FetchStatus.COMPLETE);
    });
    expect(omit(stateContainer.internalState.get().resetDefaultProfileState, 'resetId')).toEqual({
      columns: false,
      rowHeight: false,
      breakdownField: false,
    });
    expect(stateContainer.appState.get().columns).toEqual(['default_column']);
    expect(stateContainer.appState.get().rowHeight).toBeUndefined();
    dataUnsub();
    appUnsub();
  });
});
