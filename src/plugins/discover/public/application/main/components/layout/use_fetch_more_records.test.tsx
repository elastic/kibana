/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { renderHook, WrapperComponent } from '@testing-library/react-hooks';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock, esHitsMockWithSort } from '@kbn/discover-utils/src/__mocks__';
import { useFetchMoreRecords, UseFetchMoreRecordsParams } from './use_fetch_more_records';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import {
  DataDocuments$,
  DataTotalHits$,
} from '../../state_management/discover_data_state_container';
import { FetchStatus } from '../../../types';
import { DiscoverMainProvider } from '../../state_management/discover_state_provider';
import React from 'react';
import { DiscoverStateContainer } from '../../state_management/discover_state';

describe('useFetchMoreRecords', () => {
  const records = esHitsMockWithSort.map((hit) => buildDataTableRecord(hit, dataViewMock));

  const getStateContainer = ({
    fetchStatus,
    loadedRecordsCount,
    totalRecordsCount,
  }: {
    fetchStatus: FetchStatus;
    loadedRecordsCount: number;
    totalRecordsCount: number;
  }) => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.dataState.data$.documents$ = new BehaviorSubject({
      fetchStatus,
      result: records.slice(0, loadedRecordsCount),
    }) as DataDocuments$;
    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus,
      result: totalRecordsCount,
    }) as DataTotalHits$;

    return stateContainer;
  };

  const getWrapper = (
    stateContainer: DiscoverStateContainer
  ): WrapperComponent<React.PropsWithChildren<UseFetchMoreRecordsParams>> => {
    return ({ children }) => (
      <DiscoverMainProvider value={stateContainer}>
        <>{children}</>
      </DiscoverMainProvider>
    );
  };

  it('should not be allowed if all records are already loaded', async () => {
    const stateContainer = getStateContainer({
      fetchStatus: FetchStatus.COMPLETE,
      loadedRecordsCount: 3,
      totalRecordsCount: 3,
    });
    const {
      result: { current },
    } = renderHook((props) => useFetchMoreRecords(props), {
      wrapper: getWrapper(stateContainer),
      initialProps: { stateContainer },
    });

    expect(current.onFetchMoreRecords).toBeUndefined();
    expect(current.isMoreDataLoading).toBe(false);
    expect(current.totalHits).toBe(3);
  });

  it('should be allowed when there are more records to load', async () => {
    const stateContainer = getStateContainer({
      fetchStatus: FetchStatus.COMPLETE,
      loadedRecordsCount: 3,
      totalRecordsCount: 5,
    });
    const {
      result: { current },
    } = renderHook((props) => useFetchMoreRecords(props), {
      wrapper: getWrapper(stateContainer),
      initialProps: { stateContainer },
    });
    expect(current.onFetchMoreRecords).toBeDefined();
    expect(current.isMoreDataLoading).toBe(false);
    expect(current.totalHits).toBe(5);
  });

  it('should not be allowed when there is no initial documents', async () => {
    const stateContainer = getStateContainer({
      fetchStatus: FetchStatus.COMPLETE,
      loadedRecordsCount: 0,
      totalRecordsCount: 5,
    });
    const {
      result: { current },
    } = renderHook((props) => useFetchMoreRecords(props), {
      wrapper: getWrapper(stateContainer),
      initialProps: { stateContainer },
    });
    expect(current.onFetchMoreRecords).toBeUndefined();
    expect(current.isMoreDataLoading).toBe(false);
    expect(current.totalHits).toBe(5);
  });

  it('should return loading status correctly', async () => {
    const stateContainer = getStateContainer({
      fetchStatus: FetchStatus.LOADING_MORE,
      loadedRecordsCount: 3,
      totalRecordsCount: 5,
    });
    const {
      result: { current },
    } = renderHook((props) => useFetchMoreRecords(props), {
      wrapper: getWrapper(stateContainer),
      initialProps: { stateContainer },
    });
    expect(current.onFetchMoreRecords).toBeDefined();
    expect(current.isMoreDataLoading).toBe(true);
    expect(current.totalHits).toBe(5);
  });

  it('should not be allowed for ES|QL queries', async () => {
    const stateContainer = getStateContainer({
      fetchStatus: FetchStatus.COMPLETE,
      loadedRecordsCount: 3,
      totalRecordsCount: 5,
    });
    stateContainer.appState.update({ query: { esql: 'from *' } });
    const {
      result: { current },
    } = renderHook((props) => useFetchMoreRecords(props), {
      wrapper: getWrapper(stateContainer),
      initialProps: { stateContainer },
    });
    expect(current.onFetchMoreRecords).toBeUndefined();
  });
});
