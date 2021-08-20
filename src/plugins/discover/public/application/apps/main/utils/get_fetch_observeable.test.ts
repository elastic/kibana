/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getFetch$ } from './get_fetch_observable';
import { FetchStatus } from '../../../types';
import { BehaviorSubject, Subject } from 'rxjs';
import { DataPublicPluginStart } from '../../../../../../data/public';
import { createSearchSessionMock } from '../../../../__mocks__/search_session';
import { DataRefetch$ } from '../services/use_saved_search';
import { savedSearchMock } from '../../../../__mocks__/saved_search';

describe('getFetchObserveable', () => {
  test('refetch$.next should trigger fetch$.next', async (done) => {
    const searchSessionManagerMock = createSearchSessionMock();
    const dataMock = ({
      query: {
        queryString: {
          getUpdates$: () => {
            return new Subject();
          },
        },
        filterManager: {
          getFetches$: () => {
            return new Subject();
          },
        },
        timefilter: {
          timefilter: {
            getFetch$: () => {
              return new Subject();
            },
            getAutoRefreshFetch$: () => {
              return new Subject();
            },
          },
        },
      },
    } as unknown) as DataPublicPluginStart;
    const main$ = new BehaviorSubject({ fetchStatus: FetchStatus.UNINITIALIZED });
    const refetch$: DataRefetch$ = new Subject();
    const fetch$ = getFetch$({
      autoRefreshDoneCb: undefined,
      main$,
      refetch$,
      data: dataMock,
      searchSessionManager: searchSessionManagerMock.searchSessionManager,
      searchSource: savedSearchMock.searchSource,
    });

    fetch$.subscribe(() => {
      done();
    });
    refetch$.next();
  });
});
