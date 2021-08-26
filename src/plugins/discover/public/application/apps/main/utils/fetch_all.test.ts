/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { FetchStatus } from '../../../types';
import { BehaviorSubject } from 'rxjs';
import { RequestAdapter } from '../../../../../../inspector';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { ReduxLikeStateContainer } from '../../../../../../kibana_utils/common';
import { AppState } from '../services/discover_state';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { fetchAll } from './fetch_all';

describe('test fetchAll', () => {
  test('changes of fetchStatus when starting with FetchStatus.UNINITIALIZED', async (done) => {
    const subjects = {
      main$: new BehaviorSubject({ fetchStatus: FetchStatus.UNINITIALIZED }),
      documents$: new BehaviorSubject({ fetchStatus: FetchStatus.UNINITIALIZED }),
      totalHits$: new BehaviorSubject({ fetchStatus: FetchStatus.UNINITIALIZED }),
      charts$: new BehaviorSubject({ fetchStatus: FetchStatus.UNINITIALIZED }),
    };
    const deps = {
      appStateContainer: {
        getState: () => {
          return { interval: 'auto' };
        },
      } as ReduxLikeStateContainer<AppState>,
      abortController: new AbortController(),
      data: discoverServiceMock.data,
      inspectorAdapters: { requests: new RequestAdapter() },
      onResults: jest.fn(),
      searchSessionId: '123',
      initialFetchStatus: FetchStatus.UNINITIALIZED,
      useNewFieldsApi: true,
      services: discoverServiceMock,
    };

    const stateArr: FetchStatus[] = [];

    subjects.main$.subscribe((value) => stateArr.push(value.fetchStatus));

    const parentSearchSource = savedSearchMock.searchSource;
    const childSearchSource = parentSearchSource.createChild();

    fetchAll(subjects, childSearchSource, false, deps).subscribe({
      complete: () => {
        expect(stateArr).toEqual([
          FetchStatus.UNINITIALIZED,
          FetchStatus.LOADING,
          FetchStatus.COMPLETE,
        ]);
        done();
      },
    });
  });
});
