/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fetchDocuments } from './fetch_documents';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { CommonFetchParams } from './fetch_all';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { getDiscoverInternalStateMock } from '../../../__mocks__/discover_state.mock';
import { selectTabRuntimeState } from '../state_management/redux';
import { createDiscoverServicesMock } from '../../../__mocks__/services';

const getDeps = async (): Promise<CommonFetchParams> => {
  const services = createDiscoverServicesMock();
  const toolkit = getDiscoverInternalStateMock({ services });
  await toolkit.initializeTabs();
  const { dataStateContainer } = await toolkit.initializeSingleTab({
    tabId: toolkit.getCurrentTab().id,
  });
  const tabRuntimeState = selectTabRuntimeState(
    toolkit.runtimeStateManager,
    toolkit.getCurrentTab().id
  );
  const { scopedProfilesManager$, scopedEbtManager$ } = tabRuntimeState;
  return {
    dataSubjects: dataStateContainer.data$,
    initialFetchStatus: dataStateContainer.getInitialFetchStatus(),
    abortController: new AbortController(),
    inspectorAdapters: { requests: new RequestAdapter() },
    searchSessionId: '123',
    services,
    searchSource: savedSearchMock.searchSource,
    internalState: toolkit.internalState,
    scopedProfilesManager: scopedProfilesManager$.getValue(),
    scopedEbtManager: scopedEbtManager$.getValue(),
    getCurrentTab: toolkit.getCurrentTab,
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
    const deps = await getDeps();

    // Mock searchSource.build()
    savedSearchMock.searchSource.build = jest.fn(() => ({
      index: dataViewMock,
      body: { query: {} },
    }));

    // Mock services.data.search.dslPaginated()
    const mockPagination = {
      hasNextPage: true,
      nextPage: jest.fn(),
      getAllPages: jest.fn(),
    };
    deps.services.data.search.dslPaginated = jest.fn().mockResolvedValue({
      rawResponse: { hits: { hits } } as SearchResponse,
      pagination: mockPagination,
    });

    const resolveDocumentProfileSpy = jest.spyOn(
      deps.scopedProfilesManager,
      'resolveDocumentProfile'
    );
    expect(await fetchDocuments(savedSearchMock.searchSource, deps)).toEqual({
      interceptedWarnings: [],
      records: documents,
      pagination: mockPagination,
    });
    expect(resolveDocumentProfileSpy).toHaveBeenCalledTimes(2);
    expect(resolveDocumentProfileSpy).toHaveBeenCalledWith({ record: documents[0] });
    expect(resolveDocumentProfileSpy).toHaveBeenCalledWith({ record: documents[1] });
  });

  test('rejects on query failure', async () => {
    const deps = await getDeps();

    // Mock searchSource.build()
    savedSearchMock.searchSource.build = jest.fn(() => ({
      index: dataViewMock,
      body: { query: {} },
    }));

    // Mock services.data.search.dslPaginated() to throw error
    deps.services.data.search.dslPaginated = jest.fn().mockRejectedValue(new Error('Oh noes!'));

    try {
      await fetchDocuments(savedSearchMock.searchSource, deps);
    } catch (e) {
      expect(e).toEqual(new Error('Oh noes!'));
    }
  });

  test('passes session id and enables pagination', async () => {
    const deps = await getDeps();
    const hits = [
      { _id: '1', foo: 'bar' },
      { _id: '2', foo: 'baz' },
    ] as unknown as EsHitRecord[];
    const documents = hits.map((hit) => buildDataTableRecord(hit, dataViewMock));

    const searchSource = createSearchSourceMock({ index: dataViewMock });
    searchSource.build = jest.fn(() => ({
      index: dataViewMock,
      body: { query: {} },
    }));

    const mockPagination = {
      hasNextPage: true,
      nextPage: jest.fn(),
      getAllPages: jest.fn(),
    };

    deps.services.data.search.dslPaginated = jest.fn().mockResolvedValue({
      rawResponse: { hits: { hits } } as SearchResponse,
      pagination: mockPagination,
    });

    expect(await fetchDocuments(searchSource, deps)).toEqual({
      interceptedWarnings: [],
      records: documents,
      pagination: mockPagination,
    });

    expect(deps.services.data.search.dslPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ index: dataViewMock }),
      expect.objectContaining({
        sessionId: deps.searchSessionId,
        executionContext: { description: 'fetch documents' },
      })
    );
  });
});
