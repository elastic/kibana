/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { of, throwError as throwErrorRx } from 'rxjs';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { savedSearchMock, savedSearchMockWithTimeField } from '../../../__mocks__/saved_search';
import { fetchTotalHits } from './fetch_total_hits';
import { discoverServiceMock } from '../../../__mocks__/services';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { IKibanaSearchResponse } from '@kbn/data-plugin/public';
import { FetchDeps } from './fetch_all';
import { FetchStatus } from '../../types';

const getDeps = () =>
  ({
    abortController: new AbortController(),
    inspectorAdapters: { requests: new RequestAdapter() },
    searchSessionId: '123',
    data: discoverServiceMock.data,
    savedSearch: savedSearchMock,
    services: discoverServiceMock,
    initialFetchStatus: FetchStatus.LOADING,
  } as FetchDeps);

describe('test fetchTotalHits', () => {
  test('resolves returned promise with hit count', async () => {
    savedSearchMock.searchSource.fetch$ = <T>() =>
      of({ rawResponse: { hits: { total: 45 } } } as IKibanaSearchResponse<SearchResponse<T>>);

    await expect(fetchTotalHits(savedSearchMock.searchSource, getDeps())).resolves.toBe(45);
  });

  test('rejects in case of an error', async () => {
    savedSearchMock.searchSource.fetch$ = () => throwErrorRx(() => new Error('Oh noes!'));

    await expect(fetchTotalHits(savedSearchMock.searchSource, getDeps())).rejects.toEqual(
      new Error('Oh noes!')
    );
  });
  test('fetch$ is called with execution context containing savedSearch id', async () => {
    const fetch$Mock = jest
      .fn()
      .mockReturnValue(
        of({ rawResponse: { hits: { total: 45 } } } as IKibanaSearchResponse<SearchResponse>)
      );

    savedSearchMockWithTimeField.searchSource.fetch$ = fetch$Mock;

    await fetchTotalHits(savedSearchMockWithTimeField.searchSource, getDeps());
    expect(fetch$Mock.mock.calls[0][0].executionContext).toMatchInlineSnapshot(`
      Object {
        "description": "fetch total hits",
      }
    `);
  });
});
