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
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { discoverServiceMock } from '../../../__mocks__/services';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { FetchDeps } from './fetch_all';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';

const getDeps = () =>
  ({
    abortController: new AbortController(),
    inspectorAdapters: { requests: new RequestAdapter() },
    onResults: jest.fn(),
    searchSessionId: '123',
    services: discoverServiceMock,
    savedSearch: savedSearchMock,
    getAppState: () => ({ sampleSize: 100 }),
  } as unknown as FetchDeps);

describe('test fetchDocuments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('resolves with returned documents', async () => {
    const hits = [
      { _id: '1', foo: 'bar' },
      { _id: '2', foo: 'baz' },
    ] as unknown as EsHitRecord[];
    const documents = hits.map((hit) => buildDataTableRecord(hit, dataViewMock));
    savedSearchMock.searchSource.fetch$ = <T>() =>
      of({ rawResponse: { hits: { hits } } } as IKibanaSearchResponse<SearchResponse<T>>);
    const resolveDocumentProfileSpy = jest.spyOn(
      discoverServiceMock.profilesManager,
      'resolveDocumentProfile'
    );
    expect(await fetchDocuments(savedSearchMock.searchSource, getDeps())).toEqual({
      interceptedWarnings: [],
      records: documents,
    });
    expect(resolveDocumentProfileSpy).toHaveBeenCalledTimes(2);
    expect(resolveDocumentProfileSpy).toHaveBeenCalledWith({ record: documents[0] });
    expect(resolveDocumentProfileSpy).toHaveBeenCalledWith({ record: documents[1] });
  });

  test('rejects on query failure', async () => {
    savedSearchMock.searchSource.fetch$ = () => throwErrorRx(() => new Error('Oh noes!'));

    try {
      await fetchDocuments(savedSearchMock.searchSource, getDeps());
    } catch (e) {
      expect(e).toEqual(new Error('Oh noes!'));
    }
  });

  test('passes a correct session id', async () => {
    const deps = getDeps();
    const hits = [
      { _id: '1', foo: 'bar' },
      { _id: '2', foo: 'baz' },
    ] as unknown as EsHitRecord[];
    const documents = hits.map((hit) => buildDataTableRecord(hit, dataViewMock));

    // regular search source

    const searchSourceRegular = createSearchSourceMock({ index: dataViewMock });
    searchSourceRegular.fetch$ = <T>() =>
      of({ rawResponse: { hits: { hits } } } as IKibanaSearchResponse<SearchResponse<T>>);

    jest.spyOn(searchSourceRegular, 'fetch$');

    expect(await fetchDocuments(searchSourceRegular, deps)).toEqual({
      interceptedWarnings: [],
      records: documents,
    });

    expect(searchSourceRegular.fetch$ as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: deps.searchSessionId })
    );

    // search source with `search_after` for "Load more" requests

    const searchSourceForLoadMore = createSearchSourceMock({ index: dataViewMock });
    searchSourceForLoadMore.setField('searchAfter', ['100']);

    searchSourceForLoadMore.fetch$ = <T>() =>
      of({ rawResponse: { hits: { hits } } } as IKibanaSearchResponse<SearchResponse<T>>);

    jest.spyOn(searchSourceForLoadMore, 'fetch$');

    expect(await fetchDocuments(searchSourceForLoadMore, deps)).toEqual({
      interceptedWarnings: [],
      records: documents,
    });

    expect(searchSourceForLoadMore.fetch$ as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: undefined })
    );
  });
});
