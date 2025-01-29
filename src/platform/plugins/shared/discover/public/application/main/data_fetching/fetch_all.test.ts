/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FetchStatus } from '../../types';
import { BehaviorSubject, firstValueFrom, Subject } from 'rxjs';
import { reduce } from 'rxjs';
import { SearchSource } from '@kbn/data-plugin/public';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { discoverServiceMock } from '../../../__mocks__/services';
import { fetchAll, fetchMoreDocuments } from './fetch_all';
import {
  DataDocumentsMsg,
  DataMainMsg,
  DataTotalHitsMsg,
  SavedSearchData,
} from '../state_management/discover_data_state_container';
import { fetchDocuments } from './fetch_documents';
import { fetchEsql } from './fetch_esql';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock, esHitsMockWithSort } from '@kbn/discover-utils/src/__mocks__';
import { searchResponseIncompleteWarningLocalCluster } from '@kbn/search-response-warnings/src/__mocks__/search_response_warnings';

jest.mock('./fetch_documents', () => ({
  fetchDocuments: jest.fn().mockResolvedValue([]),
}));

jest.mock('./fetch_esql', () => ({
  fetchEsql: jest.fn().mockResolvedValue([]),
}));

const mockFetchDocuments = fetchDocuments as unknown as jest.MockedFunction<typeof fetchDocuments>;
const mockfetchEsql = fetchEsql as unknown as jest.MockedFunction<typeof fetchEsql>;

function subjectCollector<T>(subject: Subject<T>): () => Promise<T[]> {
  const promise = firstValueFrom(
    subject.pipe(reduce((history, value) => history.concat([value]), [] as T[]))
  );

  return () => {
    subject.complete();
    return promise;
  };
}

const waitForNextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('test fetchAll', () => {
  let subjects: SavedSearchData;
  let deps: Parameters<typeof fetchAll>[2];
  let searchSource: SearchSource;
  beforeEach(() => {
    subjects = {
      main$: new BehaviorSubject<DataMainMsg>({ fetchStatus: FetchStatus.UNINITIALIZED }),
      documents$: new BehaviorSubject<DataDocumentsMsg>({ fetchStatus: FetchStatus.UNINITIALIZED }),
      totalHits$: new BehaviorSubject<DataTotalHitsMsg>({ fetchStatus: FetchStatus.UNINITIALIZED }),
    };
    searchSource = savedSearchMock.searchSource.createChild();

    deps = {
      abortController: new AbortController(),
      inspectorAdapters: { requests: new RequestAdapter() },
      getAppState: () => ({}),
      getInternalState: () => ({
        dataView: undefined,
        isDataViewLoading: false,
        savedDataViews: [],
        adHocDataViews: [],
        defaultProfileAdHocDataViewIds: [],
        expandedDoc: undefined,
        customFilters: [],
        overriddenVisContextAfterInvalidation: undefined,
        resetDefaultProfileState: {
          resetId: 'test',
          columns: false,
          rowHeight: false,
          breakdownField: false,
        },
        dataRequestParams: {},
      }),
      searchSessionId: '123',
      initialFetchStatus: FetchStatus.UNINITIALIZED,
      savedSearch: {
        ...savedSearchMock,
        searchSource,
      },
      services: discoverServiceMock,
    };

    mockFetchDocuments.mockReset().mockResolvedValue({ records: [] });
    mockfetchEsql.mockReset().mockResolvedValue({ records: [] });
  });

  test('changes of fetchStatus when starting with FetchStatus.UNINITIALIZED', async () => {
    const stateArr: FetchStatus[] = [];

    subjects.main$.subscribe((value) => stateArr.push(value.fetchStatus));

    fetchAll(subjects, false, deps);
    await waitForNextTick();

    expect(stateArr).toEqual([
      FetchStatus.UNINITIALIZED,
      FetchStatus.LOADING,
      FetchStatus.COMPLETE,
    ]);
  });

  test('emits loading and documents on documents$ correctly', async () => {
    const collect = subjectCollector(subjects.documents$);
    const hits = [
      { _id: '1', _index: 'logs' },
      { _id: '2', _index: 'logs' },
    ];
    const documents = hits.map((hit) => buildDataTableRecord(hit, dataViewMock));
    mockFetchDocuments.mockResolvedValue({ records: documents });
    fetchAll(subjects, false, deps);
    await waitForNextTick();
    expect(await collect()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      { fetchStatus: FetchStatus.LOADING },
      {
        fetchStatus: FetchStatus.COMPLETE,
        result: documents,
      },
    ]);
  });

  test('emits loading and hit count on totalHits$ correctly', async () => {
    const collect = subjectCollector(subjects.totalHits$);
    const hits = [
      { _id: '1', _index: 'logs' },
      { _id: '2', _index: 'logs' },
    ];
    searchSource.getField('index')!.isTimeBased = () => false;
    const documents = hits.map((hit) => buildDataTableRecord(hit, dataViewMock));
    mockFetchDocuments.mockResolvedValue({ records: documents });

    subjects.totalHits$.next({
      fetchStatus: FetchStatus.LOADING,
    });
    fetchAll(subjects, false, deps);
    await waitForNextTick();
    subjects.totalHits$.next({
      fetchStatus: FetchStatus.COMPLETE,
      result: 42,
    });

    expect(await collect()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      { fetchStatus: FetchStatus.LOADING },
      { fetchStatus: FetchStatus.PARTIAL, result: 2 },
      { fetchStatus: FetchStatus.COMPLETE, result: 42 },
    ]);
  });

  test('should use charts query to fetch total hit count when chart is visible', async () => {
    const collect = subjectCollector(subjects.totalHits$);
    searchSource.getField('index')!.isTimeBased = () => true;
    subjects.totalHits$.next({
      fetchStatus: FetchStatus.LOADING,
    });
    fetchAll(subjects, false, deps);
    await waitForNextTick();
    subjects.totalHits$.next({
      fetchStatus: FetchStatus.COMPLETE,
      result: 32,
    });

    expect(await collect()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      { fetchStatus: FetchStatus.LOADING },
      { fetchStatus: FetchStatus.PARTIAL, result: 0 }, // From documents query
      { fetchStatus: FetchStatus.COMPLETE, result: 32 },
    ]);
  });

  test('should only fail totalHits$ query not main$ for error from that query', async () => {
    const collectTotalHits = subjectCollector(subjects.totalHits$);
    const collectMain = subjectCollector(subjects.main$);
    searchSource.getField('index')!.isTimeBased = () => false;
    const hits = [{ _id: '1', _index: 'logs' }];
    const documents = hits.map((hit) => buildDataTableRecord(hit, dataViewMock));
    mockFetchDocuments.mockResolvedValue({ records: documents });
    subjects.totalHits$.next({
      fetchStatus: FetchStatus.LOADING,
    });
    fetchAll(subjects, false, deps);
    await waitForNextTick();
    subjects.totalHits$.next({
      fetchStatus: FetchStatus.ERROR,
      error: { msg: 'Oh noes!' } as unknown as Error,
    });

    expect(await collectTotalHits()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      { fetchStatus: FetchStatus.LOADING },
      { fetchStatus: FetchStatus.PARTIAL, result: 1 },
      { fetchStatus: FetchStatus.ERROR, error: { msg: 'Oh noes!' } },
    ]);
    expect(await collectMain()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      { fetchStatus: FetchStatus.LOADING },
      { fetchStatus: FetchStatus.PARTIAL },
      {
        fetchStatus: FetchStatus.COMPLETE,
        foundDocuments: true,
        error: undefined,
      },
    ]);
  });

  test('should not set COMPLETE if an ERROR has been set on main$', async () => {
    const collectMain = subjectCollector(subjects.main$);
    searchSource.getField('index')!.isTimeBased = () => false;
    mockFetchDocuments.mockRejectedValue({ msg: 'This query failed' });
    subjects.totalHits$.next({
      fetchStatus: FetchStatus.LOADING,
    });
    fetchAll(subjects, false, deps);
    await waitForNextTick();
    subjects.totalHits$.next({
      fetchStatus: FetchStatus.COMPLETE,
      result: 5,
    });

    expect(await collectMain()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      { fetchStatus: FetchStatus.LOADING },
      {
        fetchStatus: FetchStatus.ERROR,
        error: { msg: 'This query failed' },
      },
      // Here should be no COMPLETE coming anymore
    ]);
  });

  test('emits loading and documents on documents$ correctly for ES|QL query', async () => {
    const collect = subjectCollector(subjects.documents$);
    const hits = [
      { _id: '1', _index: 'logs' },
      { _id: '2', _index: 'logs' },
    ];
    const documents = hits.map((hit) => buildDataTableRecord(hit, dataViewMock));
    mockfetchEsql.mockResolvedValue({
      records: documents,
      esqlQueryColumns: [{ id: '1', name: 'test1', meta: { type: 'number' } }],
    });
    const query = { esql: 'from foo' };
    deps = {
      abortController: new AbortController(),
      inspectorAdapters: { requests: new RequestAdapter() },
      searchSessionId: '123',
      initialFetchStatus: FetchStatus.UNINITIALIZED,
      savedSearch: savedSearchMock,
      services: discoverServiceMock,
      getAppState: () => ({ query }),
      getInternalState: () => ({
        dataView: undefined,
        isDataViewLoading: false,
        savedDataViews: [],
        adHocDataViews: [],
        defaultProfileAdHocDataViewIds: [],
        expandedDoc: undefined,
        customFilters: [],
        overriddenVisContextAfterInvalidation: undefined,
        resetDefaultProfileState: {
          resetId: 'test',
          columns: false,
          rowHeight: false,
          breakdownField: false,
        },
        dataRequestParams: {},
      }),
    };
    fetchAll(subjects, false, deps);
    await waitForNextTick();

    expect(await collect()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      { fetchStatus: FetchStatus.LOADING, query },
      {
        fetchStatus: FetchStatus.PARTIAL,
        result: documents,
        esqlQueryColumns: [{ id: '1', name: 'test1', meta: { type: 'number' } }],
        query,
      },
    ]);
  });

  describe('fetchMoreDocuments', () => {
    const records = esHitsMockWithSort.map((hit) => buildDataTableRecord(hit, dataViewMock));
    const initialRecords = [records[0], records[1]];
    const moreRecords = [records[2], records[3]];

    const interceptedWarnings = [searchResponseIncompleteWarningLocalCluster];

    test('should add more records', async () => {
      const collectDocuments = subjectCollector(subjects.documents$);
      const collectMain = subjectCollector(subjects.main$);
      mockFetchDocuments.mockResolvedValue({ records: moreRecords, interceptedWarnings });
      subjects.documents$.next({
        fetchStatus: FetchStatus.COMPLETE,
        result: initialRecords,
      });
      fetchMoreDocuments(subjects, deps);
      await waitForNextTick();

      expect(await collectDocuments()).toEqual([
        { fetchStatus: FetchStatus.UNINITIALIZED },
        {
          fetchStatus: FetchStatus.COMPLETE,
          result: initialRecords,
        },
        {
          fetchStatus: FetchStatus.LOADING_MORE,
          result: initialRecords,
        },
        {
          fetchStatus: FetchStatus.COMPLETE,
          result: [...initialRecords, ...moreRecords],
          interceptedWarnings,
        },
      ]);
      expect(await collectMain()).toEqual([
        {
          fetchStatus: FetchStatus.UNINITIALIZED,
        },
      ]);
    });

    test('should handle exceptions', async () => {
      const collectDocuments = subjectCollector(subjects.documents$);
      const collectMain = subjectCollector(subjects.main$);
      mockFetchDocuments.mockRejectedValue({ msg: 'This query failed' });
      subjects.documents$.next({
        fetchStatus: FetchStatus.COMPLETE,
        result: initialRecords,
      });
      fetchMoreDocuments(subjects, deps);
      await waitForNextTick();

      expect(await collectDocuments()).toEqual([
        { fetchStatus: FetchStatus.UNINITIALIZED },
        {
          fetchStatus: FetchStatus.COMPLETE,
          result: initialRecords,
        },
        {
          fetchStatus: FetchStatus.LOADING_MORE,
          result: initialRecords,
        },
        {
          fetchStatus: FetchStatus.COMPLETE,
          result: initialRecords,
        },
      ]);
      expect(await collectMain()).toEqual([
        {
          fetchStatus: FetchStatus.UNINITIALIZED,
        },
        {
          error: {
            msg: 'This query failed',
          },
          fetchStatus: 'error',
        },
      ]);
    });

    test('should swallow abort errors', async () => {
      const collect = subjectCollector(subjects.documents$);
      mockfetchEsql.mockRejectedValue({ msg: 'The query was aborted' });
      const query = { esql: 'from foo' };
      deps = {
        abortController: new AbortController(),
        inspectorAdapters: { requests: new RequestAdapter() },
        searchSessionId: '123',
        initialFetchStatus: FetchStatus.UNINITIALIZED,
        savedSearch: savedSearchMock,
        services: discoverServiceMock,
        getAppState: () => ({ query }),
        getInternalState: () => ({
          dataView: undefined,
          isDataViewLoading: false,
          savedDataViews: [],
          adHocDataViews: [],
          defaultProfileAdHocDataViewIds: [],
          expandedDoc: undefined,
          customFilters: [],
          overriddenVisContextAfterInvalidation: undefined,
          resetDefaultProfileState: {
            resetId: 'test',
            columns: false,
            rowHeight: false,
            breakdownField: false,
          },
          dataRequestParams: {},
        }),
      };
      fetchAll(subjects, false, deps);
      deps.abortController.abort();
      await waitForNextTick();

      expect((await collect()).find(({ error }) => error)).toBeUndefined();
    });
  });
});
