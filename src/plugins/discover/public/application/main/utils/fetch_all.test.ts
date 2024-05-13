/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  DataAvailableFieldsMsg,
  DataDocumentsMsg,
  DataMainMsg,
  DataTotalHitsMsg,
  RecordRawType,
  SavedSearchData,
} from '../services/discover_data_state_container';
import { fetchDocuments } from './fetch_documents';
import { fetchTextBased } from './fetch_text_based';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock, esHitsMockWithSort } from '@kbn/discover-utils/src/__mocks__';
import { searchResponseIncompleteWarningLocalCluster } from '@kbn/search-response-warnings/src/__mocks__/search_response_warnings';

jest.mock('./fetch_documents', () => ({
  fetchDocuments: jest.fn().mockResolvedValue([]),
}));

jest.mock('./fetch_text_based', () => ({
  fetchTextBased: jest.fn().mockResolvedValue([]),
}));

const mockFetchDocuments = fetchDocuments as unknown as jest.MockedFunction<typeof fetchDocuments>;
const mockfetchTextBased = fetchTextBased as unknown as jest.MockedFunction<typeof fetchTextBased>;

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
      availableFields$: new BehaviorSubject<DataAvailableFieldsMsg>({
        fetchStatus: FetchStatus.UNINITIALIZED,
      }),
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
        expandedDoc: undefined,
        customFilters: [],
        overriddenVisContextAfterInvalidation: undefined,
      }),
      searchSessionId: '123',
      initialFetchStatus: FetchStatus.UNINITIALIZED,
      useNewFieldsApi: true,
      savedSearch: {
        ...savedSearchMock,
        searchSource,
      },
      services: discoverServiceMock,
    };

    mockFetchDocuments.mockReset().mockResolvedValue({ records: [] });
    mockfetchTextBased.mockReset().mockResolvedValue({ records: [] });
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
      { fetchStatus: FetchStatus.LOADING, recordRawType: 'document' },
      {
        fetchStatus: FetchStatus.COMPLETE,
        recordRawType: 'document',
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
      recordRawType: RecordRawType.DOCUMENT,
    });
    fetchAll(subjects, false, deps);
    await waitForNextTick();
    subjects.totalHits$.next({
      fetchStatus: FetchStatus.COMPLETE,
      recordRawType: RecordRawType.DOCUMENT,
      result: 42,
    });

    expect(await collect()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      { fetchStatus: FetchStatus.LOADING, recordRawType: 'document' },
      { fetchStatus: FetchStatus.PARTIAL, recordRawType: 'document', result: 2 },
      { fetchStatus: FetchStatus.COMPLETE, recordRawType: 'document', result: 42 },
    ]);
  });

  test('should use charts query to fetch total hit count when chart is visible', async () => {
    const collect = subjectCollector(subjects.totalHits$);
    searchSource.getField('index')!.isTimeBased = () => true;
    subjects.totalHits$.next({
      fetchStatus: FetchStatus.LOADING,
      recordRawType: RecordRawType.DOCUMENT,
    });
    fetchAll(subjects, false, deps);
    await waitForNextTick();
    subjects.totalHits$.next({
      fetchStatus: FetchStatus.COMPLETE,
      recordRawType: RecordRawType.DOCUMENT,
      result: 32,
    });

    expect(await collect()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      { fetchStatus: FetchStatus.LOADING, recordRawType: 'document' },
      { fetchStatus: FetchStatus.PARTIAL, recordRawType: 'document', result: 0 }, // From documents query
      { fetchStatus: FetchStatus.COMPLETE, recordRawType: 'document', result: 32 },
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
      recordRawType: RecordRawType.DOCUMENT,
    });
    fetchAll(subjects, false, deps);
    await waitForNextTick();
    subjects.totalHits$.next({
      fetchStatus: FetchStatus.ERROR,
      recordRawType: RecordRawType.DOCUMENT,
      error: { msg: 'Oh noes!' } as unknown as Error,
    });

    expect(await collectTotalHits()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      { fetchStatus: FetchStatus.LOADING, recordRawType: 'document' },
      { fetchStatus: FetchStatus.PARTIAL, recordRawType: 'document', result: 1 },
      { fetchStatus: FetchStatus.ERROR, recordRawType: 'document', error: { msg: 'Oh noes!' } },
    ]);
    expect(await collectMain()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      { fetchStatus: FetchStatus.LOADING, recordRawType: 'document' },
      { fetchStatus: FetchStatus.PARTIAL, recordRawType: 'document' },
      {
        fetchStatus: FetchStatus.COMPLETE,
        foundDocuments: true,
        error: undefined,
        recordRawType: 'document',
      },
    ]);
  });

  test('should not set COMPLETE if an ERROR has been set on main$', async () => {
    const collectMain = subjectCollector(subjects.main$);
    searchSource.getField('index')!.isTimeBased = () => false;
    mockFetchDocuments.mockRejectedValue({ msg: 'This query failed' });
    subjects.totalHits$.next({
      fetchStatus: FetchStatus.LOADING,
      recordRawType: RecordRawType.DOCUMENT,
    });
    fetchAll(subjects, false, deps);
    await waitForNextTick();
    subjects.totalHits$.next({
      fetchStatus: FetchStatus.COMPLETE,
      recordRawType: RecordRawType.DOCUMENT,
      result: 5,
    });

    expect(await collectMain()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      { fetchStatus: FetchStatus.LOADING, recordRawType: 'document' },
      {
        fetchStatus: FetchStatus.ERROR,
        error: { msg: 'This query failed' },
        recordRawType: 'document',
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
    mockfetchTextBased.mockResolvedValue({
      records: documents,
      textBasedQueryColumns: [{ id: '1', name: 'test1', meta: { type: 'number' } }],
    });
    const query = { esql: 'from foo' };
    deps = {
      abortController: new AbortController(),
      inspectorAdapters: { requests: new RequestAdapter() },
      searchSessionId: '123',
      initialFetchStatus: FetchStatus.UNINITIALIZED,
      useNewFieldsApi: true,
      savedSearch: savedSearchMock,
      services: discoverServiceMock,
      getAppState: () => ({ query }),
      getInternalState: () => ({
        dataView: undefined,
        isDataViewLoading: false,
        savedDataViews: [],
        adHocDataViews: [],
        expandedDoc: undefined,
        customFilters: [],
        overriddenVisContextAfterInvalidation: undefined,
      }),
    };
    fetchAll(subjects, false, deps);
    await waitForNextTick();

    expect(await collect()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      { fetchStatus: FetchStatus.LOADING, recordRawType: 'plain', query },
      {
        fetchStatus: FetchStatus.PARTIAL,
        recordRawType: 'plain',
        result: documents,
        textBasedQueryColumns: [{ id: '1', name: 'test1', meta: { type: 'number' } }],
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
        recordRawType: RecordRawType.DOCUMENT,
        result: initialRecords,
      });
      fetchMoreDocuments(subjects, deps);
      await waitForNextTick();

      expect(await collectDocuments()).toEqual([
        { fetchStatus: FetchStatus.UNINITIALIZED },
        {
          fetchStatus: FetchStatus.COMPLETE,
          recordRawType: RecordRawType.DOCUMENT,
          result: initialRecords,
        },
        {
          fetchStatus: FetchStatus.LOADING_MORE,
          recordRawType: RecordRawType.DOCUMENT,
          result: initialRecords,
        },
        {
          fetchStatus: FetchStatus.COMPLETE,
          recordRawType: RecordRawType.DOCUMENT,
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
        recordRawType: RecordRawType.DOCUMENT,
        result: initialRecords,
      });
      fetchMoreDocuments(subjects, deps);
      await waitForNextTick();

      expect(await collectDocuments()).toEqual([
        { fetchStatus: FetchStatus.UNINITIALIZED },
        {
          fetchStatus: FetchStatus.COMPLETE,
          recordRawType: RecordRawType.DOCUMENT,
          result: initialRecords,
        },
        {
          fetchStatus: FetchStatus.LOADING_MORE,
          recordRawType: RecordRawType.DOCUMENT,
          result: initialRecords,
        },
        {
          fetchStatus: FetchStatus.COMPLETE,
          recordRawType: RecordRawType.DOCUMENT,
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
      mockfetchTextBased.mockRejectedValue({ msg: 'The query was aborted' });
      const query = { esql: 'from foo' };
      deps = {
        abortController: new AbortController(),
        inspectorAdapters: { requests: new RequestAdapter() },
        searchSessionId: '123',
        initialFetchStatus: FetchStatus.UNINITIALIZED,
        useNewFieldsApi: true,
        savedSearch: savedSearchMock,
        services: discoverServiceMock,
        getAppState: () => ({ query }),
        getInternalState: () => ({
          dataView: undefined,
          isDataViewLoading: false,
          savedDataViews: [],
          adHocDataViews: [],
          expandedDoc: undefined,
          customFilters: [],
          overriddenVisContextAfterInvalidation: undefined,
        }),
      };
      fetchAll(subjects, false, deps);
      deps.abortController.abort();
      await waitForNextTick();

      expect((await collect()).find(({ error }) => error)).toBeUndefined();
    });
  });
});
