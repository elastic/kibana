/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { renderHook } from '@testing-library/react-hooks';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock, esHitsMockWithSort } from '@kbn/discover-utils/src/__mocks__';
import { useFetchMoreRecords } from './use_fetch_more_records';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { DataDocuments$, DataTotalHits$ } from '../../services/discover_data_state_container';
import { FetchStatus } from '../../../types';

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

  it('should not be allowed if all records are already loaded', async () => {
    const {
      result: { current },
    } = renderHook((props) => useFetchMoreRecords(props), {
      initialProps: {
        isTextBasedQuery: false,
        stateContainer: getStateContainer({
          fetchStatus: FetchStatus.COMPLETE,
          loadedRecordsCount: 3,
          totalRecordsCount: 3,
        }),
      },
    });

    expect(current.onFetchMoreRecords).toBeUndefined();
    expect(current.isMoreDataLoading).toBe(false);
    expect(current.totalHits).toBe(3);
  });

  it('should be allowed when there are more records to load', async () => {
    const {
      result: { current },
    } = renderHook((props) => useFetchMoreRecords(props), {
      initialProps: {
        isTextBasedQuery: false,
        stateContainer: getStateContainer({
          fetchStatus: FetchStatus.COMPLETE,
          loadedRecordsCount: 3,
          totalRecordsCount: 5,
        }),
      },
    });
    expect(current.onFetchMoreRecords).toBeDefined();
    expect(current.isMoreDataLoading).toBe(false);
    expect(current.totalHits).toBe(5);
  });

  it('should not be allowed when there is no initial documents', async () => {
    const {
      result: { current },
    } = renderHook((props) => useFetchMoreRecords(props), {
      initialProps: {
        isTextBasedQuery: false,
        stateContainer: getStateContainer({
          fetchStatus: FetchStatus.COMPLETE,
          loadedRecordsCount: 0,
          totalRecordsCount: 5,
        }),
      },
    });
    expect(current.onFetchMoreRecords).toBeUndefined();
    expect(current.isMoreDataLoading).toBe(false);
    expect(current.totalHits).toBe(5);
  });

  it('should return loading status correctly', async () => {
    const {
      result: { current },
    } = renderHook((props) => useFetchMoreRecords(props), {
      initialProps: {
        isTextBasedQuery: false,
        stateContainer: getStateContainer({
          fetchStatus: FetchStatus.LOADING_MORE,
          loadedRecordsCount: 3,
          totalRecordsCount: 5,
        }),
      },
    });
    expect(current.onFetchMoreRecords).toBeDefined();
    expect(current.isMoreDataLoading).toBe(true);
    expect(current.totalHits).toBe(5);
  });

  it('should not be allowed for text-based queries', async () => {
    const {
      result: { current },
    } = renderHook((props) => useFetchMoreRecords(props), {
      initialProps: {
        isTextBasedQuery: true,
        stateContainer: getStateContainer({
          fetchStatus: FetchStatus.COMPLETE,
          loadedRecordsCount: 3,
          totalRecordsCount: 5,
        }),
      },
    });
    expect(current.onFetchMoreRecords).toBeUndefined();
  });
});
