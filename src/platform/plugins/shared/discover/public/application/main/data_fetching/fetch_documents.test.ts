/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fetchDocuments } from './fetch_documents';
import { throwError as throwErrorRx, of } from 'rxjs';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { discoverServiceMock } from '../../../__mocks__/services';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { CommonFetchParams } from './fetch_all';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { getDiscoverStateMock } from '../../../__mocks__/discover_state.mock';
import { selectTabRuntimeState } from '../state_management/redux';

const getDeps = (): CommonFetchParams => {
  const { appState, internalState, dataState, runtimeStateManager, getCurrentTab } =
    getDiscoverStateMock({});
  const { scopedProfilesManager$, scopedEbtManager$ } = selectTabRuntimeState(
    runtimeStateManager,
    getCurrentTab().id
  );
  appState.update({ sampleSize: 100 });
  return {
    dataSubjects: dataState.data$,
    initialFetchStatus: dataState.getInitialFetchStatus(),
    abortController: new AbortController(),
    inspectorAdapters: { requests: new RequestAdapter() },
    searchSessionId: '123',
    services: discoverServiceMock,
    savedSearch: savedSearchMock,
    internalState,
    appStateContainer: appState,
    scopedProfilesManager: scopedProfilesManager$.getValue(),
    scopedEbtManager: scopedEbtManager$.getValue(),
  };
};

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
    const deps = getDeps();
    const resolveDocumentProfileSpy = jest.spyOn(
      deps.scopedProfilesManager,
      'resolveDocumentProfile'
    );
    expect(await fetchDocuments(savedSearchMock.searchSource, deps)).toEqual({
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
