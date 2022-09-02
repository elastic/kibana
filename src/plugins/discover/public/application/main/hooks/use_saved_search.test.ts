/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Subject } from 'rxjs';
import { waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import { createSearchSessionMock } from '../../../__mocks__/search_session';
import { discoverServiceMock } from '../../../__mocks__/services';
import { savedSearchMock, savedSearchMockWithSQL } from '../../../__mocks__/saved_search';
import { RecordRawType, useSavedSearch } from './use_saved_search';
import { getStateContainer } from '../services/discover_state';
import { useDiscoverState } from './use_discover_state';
import { FetchStatus } from '../../types';

describe('test useSavedSearch', () => {
  test('useSavedSearch return is valid', async () => {
    const { history, searchSessionManager } = createSearchSessionMock();
    const stateContainer = getStateContainer({
      savedSearch: savedSearchMock,
      history,
      services: discoverServiceMock,
    });

    const { result } = renderHook(() => {
      return useSavedSearch({
        initialFetchStatus: FetchStatus.LOADING,
        savedSearch: savedSearchMock,
        searchSessionManager,
        services: discoverServiceMock,
        stateContainer,
        useNewFieldsApi: true,
      });
    });

    expect(result.current.refetch$).toBeInstanceOf(Subject);
    expect(result.current.data$.main$.getValue().fetchStatus).toBe(FetchStatus.LOADING);
    expect(result.current.data$.documents$.getValue().fetchStatus).toBe(FetchStatus.LOADING);
    expect(result.current.data$.totalHits$.getValue().fetchStatus).toBe(FetchStatus.LOADING);
    expect(result.current.data$.charts$.getValue().fetchStatus).toBe(FetchStatus.LOADING);
  });
  test('refetch$ triggers a search', async () => {
    const { history, searchSessionManager } = createSearchSessionMock();
    const stateContainer = getStateContainer({
      savedSearch: savedSearchMock,
      history,
      services: discoverServiceMock,
    });

    discoverServiceMock.data.query.timefilter.timefilter.getTime = jest.fn(() => {
      return { from: '2021-05-01T20:00:00Z', to: '2021-05-02T20:00:00Z' };
    });

    renderHook(() => {
      return useDiscoverState({
        services: discoverServiceMock,
        history,
        savedSearch: savedSearchMock,
        setExpandedDoc: jest.fn(),
        dataViewList: [],
      });
    });

    const { result } = renderHook(() => {
      return useSavedSearch({
        initialFetchStatus: FetchStatus.LOADING,
        savedSearch: savedSearchMock,
        searchSessionManager,
        services: discoverServiceMock,
        stateContainer,
        useNewFieldsApi: true,
      });
    });

    result.current.refetch$.next(undefined);

    await waitFor(() => {
      expect(result.current.data$.main$.getValue().fetchStatus).toEqual(FetchStatus.COMPLETE);
    });
    await waitFor(() => {
      return result.current.data$.main$.getValue().fetchStatus === FetchStatus.LOADING;
    });
    await waitFor(() => {
      return result.current.data$.main$.getValue().fetchStatus === FetchStatus.COMPLETE;
    });
    await waitFor(() => {
      return result.current.data$.totalHits$.getValue().fetchStatus === FetchStatus.COMPLETE;
    });
    expect(result.current.data$.documents$.getValue().result).toEqual([]);
    expect(result.current.data$.totalHits$.getValue().result).toBe(0);
  });

  test('reset sets back to initial state', async () => {
    const { history, searchSessionManager } = createSearchSessionMock();
    const stateContainer = getStateContainer({
      savedSearch: savedSearchMock,
      history,
      services: discoverServiceMock,
    });

    discoverServiceMock.data.query.timefilter.timefilter.getTime = jest.fn(() => {
      return { from: '2021-05-01T20:00:00Z', to: '2021-05-02T20:00:00Z' };
    });

    renderHook(() => {
      return useDiscoverState({
        services: discoverServiceMock,
        history,
        savedSearch: savedSearchMock,
        setExpandedDoc: jest.fn(),
        dataViewList: [],
      });
    });

    const { result, waitForValueToChange } = renderHook(() => {
      return useSavedSearch({
        initialFetchStatus: FetchStatus.LOADING,
        savedSearch: savedSearchMock,
        searchSessionManager,
        services: discoverServiceMock,
        stateContainer,
        useNewFieldsApi: true,
      });
    });

    result.current.refetch$.next(undefined);

    await waitForValueToChange(() => {
      return result.current.data$.main$.value.fetchStatus === FetchStatus.COMPLETE;
    });

    result.current.reset();
    expect(result.current.data$.main$.value.fetchStatus).toBe(FetchStatus.LOADING);
  });

  test('useSavedSearch returns plain record raw type', async () => {
    const { history, searchSessionManager } = createSearchSessionMock();
    const stateContainer = getStateContainer({
      savedSearch: savedSearchMockWithSQL,
      history,
      services: discoverServiceMock,
    });

    const { result } = renderHook(() => {
      return useSavedSearch({
        initialFetchStatus: FetchStatus.LOADING,
        savedSearch: savedSearchMock,
        searchSessionManager,
        services: discoverServiceMock,
        stateContainer,
        useNewFieldsApi: true,
      });
    });

    expect(result.current.data$.main$.getValue().recordRawType).toBe(RecordRawType.PLAIN);
  });
});
