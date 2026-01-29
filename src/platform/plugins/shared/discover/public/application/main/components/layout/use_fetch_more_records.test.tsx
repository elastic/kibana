/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock, esHitsMockWithSort } from '@kbn/discover-utils/src/__mocks__';
import { useFetchMoreRecords } from './use_fetch_more_records';
import type { InternalStateMockToolkit } from '../../../../__mocks__/discover_state.mock';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { FetchStatus } from '../../../types';
import React from 'react';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import { internalStateActions } from '../../state_management/redux';

const setup = async () => {
  const toolkit = getDiscoverInternalStateMock();

  await toolkit.initializeTabs();

  return toolkit;
};

const renderUseFetchMoreRecords = async ({
  toolkit,
  fetchStatus,
  loadedRecordsCount,
  totalRecordsCount,
}: {
  toolkit: InternalStateMockToolkit;
  fetchStatus: FetchStatus;
  loadedRecordsCount: number;
  totalRecordsCount: number;
}) => {
  const records = esHitsMockWithSort.map((hit) => buildDataTableRecord(hit, dataViewMock));
  const { stateContainer } = await toolkit.initializeSingleTab({
    tabId: toolkit.getCurrentTab().id,
  });

  stateContainer.dataState.data$.documents$.next({
    fetchStatus,
    result: records.slice(0, loadedRecordsCount),
  });
  stateContainer.dataState.data$.totalHits$.next({
    fetchStatus,
    result: totalRecordsCount,
  });

  const { result } = renderHook((props) => useFetchMoreRecords(props), {
    wrapper: ({ children }) => (
      <DiscoverToolkitTestProvider toolkit={toolkit}>{children}</DiscoverToolkitTestProvider>
    ),
    initialProps: { stateContainer },
  });

  return { result };
};

describe('useFetchMoreRecords', () => {
  it('should not be allowed if all records are already loaded', async () => {
    const toolkit = await setup();
    const {
      result: { current },
    } = await renderUseFetchMoreRecords({
      toolkit,
      fetchStatus: FetchStatus.COMPLETE,
      loadedRecordsCount: 3,
      totalRecordsCount: 3,
    });

    expect(current.onFetchMoreRecords).toBeUndefined();
    expect(current.isMoreDataLoading).toBe(false);
    expect(current.totalHits).toBe(3);
  });

  it('should be allowed when there are more records to load', async () => {
    const toolkit = await setup();
    const {
      result: { current },
    } = await renderUseFetchMoreRecords({
      toolkit,
      fetchStatus: FetchStatus.COMPLETE,
      loadedRecordsCount: 3,
      totalRecordsCount: 5,
    });

    expect(current.onFetchMoreRecords).toBeDefined();
    expect(current.isMoreDataLoading).toBe(false);
    expect(current.totalHits).toBe(5);
  });

  it('should not be allowed when there is no initial documents', async () => {
    const toolkit = await setup();
    const {
      result: { current },
    } = await renderUseFetchMoreRecords({
      toolkit,
      fetchStatus: FetchStatus.COMPLETE,
      loadedRecordsCount: 0,
      totalRecordsCount: 5,
    });

    expect(current.onFetchMoreRecords).toBeUndefined();
    expect(current.isMoreDataLoading).toBe(false);
    expect(current.totalHits).toBe(5);
  });

  it('should return loading status correctly', async () => {
    const toolkit = await setup();
    const {
      result: { current },
    } = await renderUseFetchMoreRecords({
      toolkit,
      fetchStatus: FetchStatus.LOADING_MORE,
      loadedRecordsCount: 3,
      totalRecordsCount: 5,
    });

    expect(current.onFetchMoreRecords).toBeDefined();
    expect(current.isMoreDataLoading).toBe(true);
    expect(current.totalHits).toBe(5);
  });

  it('should not be allowed for ES|QL queries', async () => {
    const toolkit = await setup();

    toolkit.internalState.dispatch(
      internalStateActions.updateAppState({
        tabId: toolkit.getCurrentTab().id,
        appState: { query: { esql: 'from *' } },
      })
    );

    const {
      result: { current },
    } = await renderUseFetchMoreRecords({
      toolkit,
      fetchStatus: FetchStatus.COMPLETE,
      loadedRecordsCount: 3,
      totalRecordsCount: 5,
    });

    expect(current.onFetchMoreRecords).toBeUndefined();
  });
});
