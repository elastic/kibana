/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Subject } from 'rxjs';
import { renderHook } from '@testing-library/react-hooks';
import { createSearchSessionMock } from '../../../__mocks__/search_session';
import { discoverServiceMock } from '../../../__mocks__/services';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { useSavedSearch } from './use_saved_search';
import { getState } from '../services/discover_state';
import { uiSettingsMock } from '../../../__mocks__/ui_settings';
import { useDiscoverState } from './use_discover_state';
import { FetchStatus } from '../../types';

describe('test useSavedSearch', () => {
  test('useSavedSearch return is valid', async () => {
    const { history, searchSessionManager } = createSearchSessionMock();
    const stateContainer = getState({
      getStateDefaults: () => ({ index: 'the-index-pattern-id' }),
      history,
      uiSettings: uiSettingsMock,
    });

    const { result } = renderHook(() => {
      return useSavedSearch({
        initialFetchStatus: FetchStatus.LOADING,
        savedSearch: savedSearchMock,
        searchSessionManager,
        searchSource: savedSearchMock.searchSource.createCopy(),
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
    const stateContainer = getState({
      getStateDefaults: () => ({ index: 'the-index-pattern-id' }),
      history,
      uiSettings: uiSettingsMock,
    });

    discoverServiceMock.data.query.timefilter.timefilter.getTime = jest.fn(() => {
      return { from: '2021-05-01T20:00:00Z', to: '2021-05-02T20:00:00Z' };
    });

    const { result: resultState } = renderHook(() => {
      return useDiscoverState({
        services: discoverServiceMock,
        history,
        savedSearch: savedSearchMock,
        setExpandedDoc: jest.fn(),
      });
    });

    const { result, waitForValueToChange } = renderHook(() => {
      return useSavedSearch({
        initialFetchStatus: FetchStatus.LOADING,
        savedSearch: savedSearchMock,
        searchSessionManager,
        searchSource: resultState.current.searchSource,
        services: discoverServiceMock,
        stateContainer,
        useNewFieldsApi: true,
      });
    });

    result.current.refetch$.next(undefined);

    await waitForValueToChange(() => {
      return result.current.data$.main$.value.fetchStatus === 'complete';
    });

    expect(result.current.data$.totalHits$.value.result).toBe(0);
    expect(result.current.data$.documents$.value.result).toEqual([]);
  });

  test('reset sets back to initial state', async () => {
    const { history, searchSessionManager } = createSearchSessionMock();
    const stateContainer = getState({
      getStateDefaults: () => ({ index: 'the-index-pattern-id' }),
      history,
      uiSettings: uiSettingsMock,
    });

    discoverServiceMock.data.query.timefilter.timefilter.getTime = jest.fn(() => {
      return { from: '2021-05-01T20:00:00Z', to: '2021-05-02T20:00:00Z' };
    });

    const { result: resultState } = renderHook(() => {
      return useDiscoverState({
        services: discoverServiceMock,
        history,
        savedSearch: savedSearchMock,
        setExpandedDoc: jest.fn(),
      });
    });

    const { result, waitForValueToChange } = renderHook(() => {
      return useSavedSearch({
        initialFetchStatus: FetchStatus.LOADING,
        savedSearch: savedSearchMock,
        searchSessionManager,
        searchSource: resultState.current.searchSource,
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
});
