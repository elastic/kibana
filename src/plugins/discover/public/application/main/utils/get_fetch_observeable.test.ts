/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { BehaviorSubject, Subject } from 'rxjs';
import { fakeSchedulers } from 'rxjs-marbles/jest';
import { getFetch$ } from './get_fetch_observable';
import { FetchStatus } from '../../types';
import { DataPublicPluginStart } from '../../../../../data/public';
import { createSearchSessionMock } from '../../../__mocks__/search_session';
import { DataRefetch$ } from './use_saved_search';
import { savedSearchMock, savedSearchMockWithTimeField } from '../../../__mocks__/saved_search';

function createDataMock(
  queryString$: Subject<unknown>,
  filterManager$: Subject<unknown>,
  timefilterFetch$: Subject<unknown>,
  autoRefreshFetch$: Subject<unknown>
) {
  return {
    query: {
      queryString: {
        getUpdates$: () => {
          return queryString$;
        },
      },
      filterManager: {
        getFetches$: () => {
          return filterManager$;
        },
      },
      timefilter: {
        timefilter: {
          getFetch$: () => {
            return timefilterFetch$;
          },
          getAutoRefreshFetch$: () => {
            return autoRefreshFetch$;
          },
        },
      },
    },
  } as unknown as DataPublicPluginStart;
}

describe('getFetchObservable', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('refetch$.next should trigger fetch$.next', async (done) => {
    const searchSessionManagerMock = createSearchSessionMock();

    const main$ = new BehaviorSubject({ fetchStatus: FetchStatus.UNINITIALIZED });
    const refetch$: DataRefetch$ = new Subject();
    const fetch$ = getFetch$({
      setAutoRefreshDone: jest.fn(),
      main$,
      refetch$,
      data: createDataMock(new Subject(), new Subject(), new Subject(), new Subject()),
      searchSessionManager: searchSessionManagerMock.searchSessionManager,
      searchSource: savedSearchMock.searchSource,
      initialFetchStatus: FetchStatus.LOADING,
    });

    fetch$.subscribe(() => {
      done();
    });
    refetch$.next(undefined);
  });

  test(
    'getAutoRefreshFetch$ should trigger fetch$.next',
    fakeSchedulers((advance) => {
      jest.useFakeTimers();
      const searchSessionManagerMock = createSearchSessionMock();
      const autoRefreshFetch$ = new Subject();

      const main$ = new BehaviorSubject({ fetchStatus: FetchStatus.UNINITIALIZED });
      const refetch$: DataRefetch$ = new Subject();
      const dataMock = createDataMock(
        new Subject(),
        new Subject(),
        new Subject(),
        autoRefreshFetch$
      );
      const setAutoRefreshDone = jest.fn();
      const fetch$ = getFetch$({
        setAutoRefreshDone,
        main$,
        refetch$,
        data: dataMock,
        searchSessionManager: searchSessionManagerMock.searchSessionManager,
        searchSource: savedSearchMockWithTimeField.searchSource,
        initialFetchStatus: FetchStatus.LOADING,
      });

      const fetchfnMock = jest.fn();
      fetch$.subscribe(() => {
        fetchfnMock();
      });
      autoRefreshFetch$.next(jest.fn());
      advance(100);
      expect(fetchfnMock).toHaveBeenCalledTimes(1);
      expect(setAutoRefreshDone).toHaveBeenCalled();
    })
  );
});
