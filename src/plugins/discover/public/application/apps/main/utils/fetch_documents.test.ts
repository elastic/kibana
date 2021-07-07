/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { fetchDocuments } from './fetch_documents';
import { FetchStatus } from '../../../types';
import { BehaviorSubject, throwError as throwErrorRx } from 'rxjs';
import { RequestAdapter } from '../../../../../../inspector';
import { savedSearchMock } from '../../../../__mocks__/saved_search';

describe('test fetchDocuments', () => {
  test('changes of fetchStatus are correct when starting with FetchStatus.UNINITIALIZED', async (done) => {
    const data$ = new BehaviorSubject({ fetchStatus: FetchStatus.UNINITIALIZED });
    const deps = {
      abortController: new AbortController(),
      inspectorAdapters: { requests: new RequestAdapter() },
      onResults: jest.fn(),
      searchSessionId: '123',
    };

    const stateArr: FetchStatus[] = [];

    data$.subscribe((value) => stateArr.push(value.fetchStatus));

    fetchDocuments(data$, savedSearchMock.searchSource, deps).subscribe({
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
  test('change of fetchStatus on fetch error', async (done) => {
    const data$ = new BehaviorSubject({ fetchStatus: FetchStatus.UNINITIALIZED });
    const deps = {
      abortController: new AbortController(),
      inspectorAdapters: { requests: new RequestAdapter() },
      onResults: jest.fn(),
      searchSessionId: '123',
    };

    savedSearchMock.searchSource.fetch$ = () => throwErrorRx({ msg: 'Oh noes!' });

    const stateArr: FetchStatus[] = [];

    data$.subscribe((value) => stateArr.push(value.fetchStatus));

    fetchDocuments(data$, savedSearchMock.searchSource, deps).subscribe({
      error: () => {
        expect(stateArr).toEqual([
          FetchStatus.UNINITIALIZED,
          FetchStatus.LOADING,
          FetchStatus.ERROR,
        ]);
        done();
      },
    });
  });
});
