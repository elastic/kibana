/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { fetchDocuments } from './fetch_documents';
import { throwError as throwErrorRx, of } from 'rxjs';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { savedSearchMock, savedSearchMockWithTimeField } from '../../../__mocks__/saved_search';
import { discoverServiceMock } from '../../../__mocks__/services';
import { IKibanaSearchResponse } from '@kbn/data-plugin/public';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { FetchDeps } from './fetch_all';
import { fetchTotalHits } from './fetch_total_hits';
import type { EsHitRecord } from '../../../types';
import { buildDataTableRecord } from '../../../utils/build_data_record';
import { dataViewMock } from '../../../__mocks__/data_view';

const getDeps = () =>
  ({
    abortController: new AbortController(),
    inspectorAdapters: { requests: new RequestAdapter() },
    onResults: jest.fn(),
    searchSessionId: '123',
    services: discoverServiceMock,
    savedSearch: savedSearchMock,
  } as unknown as FetchDeps);

describe('test fetchDocuments', () => {
  test('resolves with returned documents', async () => {
    const hits = [
      { _id: '1', foo: 'bar' },
      { _id: '2', foo: 'baz' },
    ] as unknown as EsHitRecord[];
    const documents = hits.map((hit) => buildDataTableRecord(hit, dataViewMock));
    savedSearchMock.searchSource.fetch$ = <T>() =>
      of({ rawResponse: { hits: { hits } } } as IKibanaSearchResponse<SearchResponse<T>>);
    expect(fetchDocuments(savedSearchMock.searchSource, getDeps())).resolves.toEqual(documents);
  });

  test('rejects on query failure', () => {
    savedSearchMock.searchSource.fetch$ = () => throwErrorRx(() => new Error('Oh noes!'));

    expect(fetchDocuments(savedSearchMock.searchSource, getDeps())).rejects.toEqual(
      new Error('Oh noes!')
    );
  });

  test('fetch$ is called with execution context containing savedSearch id', async () => {
    const fetch$Mock = jest.fn().mockReturnValue(
      of({
        rawResponse: { hits: { hits: [] } },
      } as unknown as IKibanaSearchResponse<SearchResponse>)
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
