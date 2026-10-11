/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FetchStatus } from '../../types';
import { createMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';
import type { Observable, Subject } from 'rxjs';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { reduce } from 'rxjs';
import type { SearchSource } from '@kbn/data-plugin/public';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { fetchAll, fetchMoreDocuments } from './fetch_all';
import type {
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
import { getDiscoverInternalStateMock } from '../../../__mocks__/discover_state.mock';
import { internalStateActions, selectTabRuntimeState } from '../state_management/redux';
import type { DataView } from '@kbn/data-views-plugin/common';
import { AbortReason } from '@kbn/kibana-utils-plugin/common';
import { createDiscoverServicesMock } from '../../../__mocks__/services';
import type { RecordsFetchResponse } from '../../types';

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

// Mirrors a request cancelled before ES returned an async search id: it only settles by rejecting on abort
const rejectWhenAborted = (signal?: AbortSignal) =>
  new Promise<never>((_, reject) => {
    signal?.addEventListener('abort', () =>
      reject(new Error('[esql] > Unexpected error from Elasticsearch: canceled'))
    );
  });

const createDeferred = <T>() => {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

// Unlike subjectCollector, never completes the subject, so fetches that are expected to stay
// pending don't reject with an EmptyError that leaks into the next test
const collectValues = <T>(subject: Observable<T>): T[] => {
  const values: T[] = [];
  subject.subscribe((value) => values.push(value));
  return values;
};

const lastValue = <T>(values: T[]) => values[values.length - 1];

describe('test fetchAll', () => {
  let subjects: SavedSearchData;
  let deps: Parameters<typeof fetchAll>[0];
  let searchSource: SearchSource;

  beforeEach(async () => {
    subjects = {
      main$: new BehaviorSubject<DataMainMsg>({ fetchStatus: FetchStatus.UNINITIALIZED }),
      documents$: new BehaviorSubject<DataDocumentsMsg>({ fetchStatus: FetchStatus.UNINITIALIZED }),
      totalHits$: new BehaviorSubject<DataTotalHitsMsg>({ fetchStatus: FetchStatus.UNINITIALIZED }),
    };
    searchSource = savedSearchMock.searchSource.createChild();
    const services = createDiscoverServicesMock();
    const toolkit = getDiscoverInternalStateMock({ services });
    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({
      tabId: toolkit.getCurrentTab().id,
      skipWaitForDataFetching: true,
    });
    const { scopedProfilesManager$, scopedEbtManager$ } = selectTabRuntimeState(
      toolkit.runtimeStateManager,
      toolkit.getCurrentTab().id
    );
    deps = {
      dataSubjects: subjects,
      reset: false,
      abortController: new AbortController(),
      inspectorAdapters: { requests: new RequestAdapter() },
      internalState: toolkit.internalState,
      scopedProfilesManager: scopedProfilesManager$.getValue(),
      scopedEbtManager: scopedEbtManager$.getValue(),
      searchSessionId: '123',
      initialFetchStatus: FetchStatus.UNINITIALIZED,
      searchSource,
      services,
      getCurrentTab: toolkit.getCurrentTab,
    };
    mockFetchDocuments.mockReset().mockResolvedValue({ records: [] });
    mockfetchEsql.mockReset().mockResolvedValue({ records: [] });
  });

  test('changes of fetchStatus when starting with FetchStatus.UNINITIALIZED', async () => {
    const stateArr: FetchStatus[] = [];

    subjects.main$.subscribe((value) => stateArr.push(value.fetchStatus));

    fetchAll(deps);
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
    fetchAll(deps);
    await waitForNextTick();
    expect(await collect()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      {
        fetchStatus: FetchStatus.LOADING,
        query: { query: '', language: 'kuery' },
        dataSource: expect.any(Object),
      },
      {
        fetchStatus: FetchStatus.COMPLETE,
        interceptedWarnings: [],
        result: documents,
        dataSource: expect.any(Object),
        query: { query: '', language: 'kuery' },
      },
    ]);
  });

  test('emits loading and hit count on totalHits$ correctly', async () => {
    const collect = subjectCollector(subjects.totalHits$);
    const hits = [
      { _id: '1', _index: 'logs' },
      { _id: '2', _index: 'logs' },
    ];
    searchSource.getField('index')!.isTimeBased = (() => false) as DataView['isTimeBased'];
    const documents = hits.map((hit) => buildDataTableRecord(hit, dataViewMock));
    mockFetchDocuments.mockResolvedValue({ records: documents });

    subjects.totalHits$.next({
      fetchStatus: FetchStatus.LOADING,
    });
    fetchAll(deps);
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
    searchSource.getField('index')!.isTimeBased = (() => true) as DataView['isTimeBased'];
    subjects.totalHits$.next({
      fetchStatus: FetchStatus.LOADING,
    });
    fetchAll(deps);
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
    searchSource.getField('index')!.isTimeBased = (() => false) as DataView['isTimeBased'];
    const hits = [{ _id: '1', _index: 'logs' }];
    const documents = hits.map((hit) => buildDataTableRecord(hit, dataViewMock));
    mockFetchDocuments.mockResolvedValue({ records: documents });
    subjects.totalHits$.next({
      fetchStatus: FetchStatus.LOADING,
    });
    fetchAll(deps);
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
    searchSource.getField('index')!.isTimeBased = (() => false) as DataView['isTimeBased'];
    mockFetchDocuments.mockRejectedValue({ msg: 'This query failed' });
    subjects.totalHits$.next({
      fetchStatus: FetchStatus.LOADING,
    });
    fetchAll(deps);
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
    const query = { esql: 'from foo' };
    deps.internalState.dispatch(
      internalStateActions.updateAppState({
        tabId: deps.getCurrentTab().id,
        appState: { query },
      })
    );
    const mockEsqlSource = createMockEsqlSource([], [], '@timestamp');
    mockfetchEsql.mockResolvedValue({ records: documents, dataSource: mockEsqlSource });
    fetchAll({
      ...deps,
      esqlSource: mockEsqlSource,
    });
    await waitForNextTick();

    expect(await collect()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      {
        fetchStatus: FetchStatus.LOADING,
        query,
        dataSource: expect.objectContaining({ id: 'mock-esql-source' }),
      },
      {
        fetchStatus: FetchStatus.PARTIAL,
        interceptedWarnings: [],
        result: documents,
        dataSource: expect.objectContaining({ id: 'mock-esql-source' }),
        query,
      },
    ]);
  });

  describe('cancellation', () => {
    const esqlQuery = { esql: 'from foo' };
    const hits = [
      { _id: '1', _index: 'logs' },
      { _id: '2', _index: 'logs' },
    ];
    const documents = hits.map((hit) => buildDataTableRecord(hit, dataViewMock));
    let activeAbortController: AbortController | undefined;

    const setEsqlQuery = () => {
      deps.internalState.dispatch(
        internalStateActions.updateAppState({
          tabId: deps.getCurrentTab().id,
          appState: { query: esqlQuery },
        })
      );
    };

    // Starts a fetch the way the data state container does: each fetch gets its own
    // controller, and only the most recently started one is active
    const startFetch = (
      abortController: AbortController,
      overrides: Partial<Parameters<typeof fetchAll>[0]> = {}
    ) => {
      activeAbortController = abortController;
      return fetchAll({
        ...deps,
        esqlSource: createMockEsqlSource([], [], '@timestamp'),
        abortController,
        isActiveFetch: () => activeAbortController === abortController,
        ...overrides,
      });
    };

    beforeEach(() => {
      activeAbortController = undefined;
      mockfetchEsql.mockImplementation(({ abortSignal }) => rejectWhenAborted(abortSignal));
      mockFetchDocuments.mockImplementation((_searchSource, { abortController }) =>
        rejectWhenAborted(abortController.signal)
      );
    });

    test('should settle all subjects without an error when an ES|QL query is cancelled', async () => {
      setEsqlQuery();
      const documentsValues = collectValues(subjects.documents$);
      const totalHitsValues = collectValues(subjects.totalHits$);
      const mainValues = collectValues(subjects.main$);
      const abortController = new AbortController();

      startFetch(abortController);
      abortController.abort(AbortReason.CANCELED);
      await waitForNextTick();
      expect(lastValue(documentsValues).fetchStatus).toBe(FetchStatus.COMPLETE);
      expect(lastValue(totalHitsValues).fetchStatus).toBe(FetchStatus.COMPLETE);
      expect(lastValue(mainValues)).toEqual({
        fetchStatus: FetchStatus.COMPLETE,
        foundDocuments: true,
        error: undefined,
      });
      expect(
        [...documentsValues, ...totalHitsValues, ...mainValues].find(({ error }) => error)
      ).toBeUndefined();
    });

    test('should keep previous results when an ES|QL query is cancelled after a successful fetch', async () => {
      setEsqlQuery();
      mockfetchEsql.mockResolvedValueOnce({ records: documents });
      startFetch(new AbortController());
      await waitForNextTick();
      // Stands in for the PARTIAL -> COMPLETE promotion done by esqlFetchSubscribe
      subjects.documents$.next({
        ...subjects.documents$.getValue(),
        fetchStatus: FetchStatus.COMPLETE,
      });
      await waitForNextTick();

      const documentsValues = collectValues(subjects.documents$);
      const totalHitsValues = collectValues(subjects.totalHits$);
      const abortController = new AbortController();
      startFetch(abortController);
      abortController.abort(AbortReason.CANCELED);
      await waitForNextTick();

      const cancelledDocumentsMsg = lastValue(documentsValues);
      expect(cancelledDocumentsMsg.fetchStatus).toBe(FetchStatus.COMPLETE);
      // No result key means useDataState merges the message and keeps the previously rendered rows
      expect(cancelledDocumentsMsg).not.toHaveProperty('result');
      expect(lastValue(totalHitsValues)).toEqual({
        fetchStatus: FetchStatus.COMPLETE,
        result: documents.length,
      });
    });

    test('should settle documents$ and keep the previous hit count when a classic query is cancelled', async () => {
      subjects.totalHits$.next({ fetchStatus: FetchStatus.COMPLETE, result: 42 });
      const documentsValues = collectValues(subjects.documents$);
      const totalHitsValues = collectValues(subjects.totalHits$);
      const mainValues = collectValues(subjects.main$);
      const abortController = new AbortController();

      startFetch(abortController);
      abortController.abort(AbortReason.CANCELED);
      await waitForNextTick();
      expect(lastValue(documentsValues).fetchStatus).toBe(FetchStatus.COMPLETE);
      expect(documentsValues.find(({ error }) => error)).toBeUndefined();
      expect(lastValue(totalHitsValues)).toEqual({
        fetchStatus: FetchStatus.COMPLETE,
        result: 42,
      });
      expect(lastValue(mainValues).fetchStatus).toBe(FetchStatus.COMPLETE);
    });

    test.each([AbortReason.REPLACED, AbortReason.CLEANUP])(
      'should not publish a terminal state when aborted with %s',
      async (reason) => {
        setEsqlQuery();
        const documentsValues = collectValues(subjects.documents$);
        const totalHitsValues = collectValues(subjects.totalHits$);
        const mainValues = collectValues(subjects.main$);
        const abortController = new AbortController();

        startFetch(abortController);
        abortController.abort(reason);
        await waitForNextTick();
        expect(lastValue(documentsValues).fetchStatus).toBe(FetchStatus.LOADING);
        expect(documentsValues.find(({ error }) => error)).toBeUndefined();
        expect(lastValue(totalHitsValues).fetchStatus).toBe(FetchStatus.LOADING);
        expect(lastValue(mainValues).fetchStatus).toBe(FetchStatus.LOADING);
      }
    );

    test('should not call onFetchRecordsComplete when the query is cancelled before returning results', async () => {
      setEsqlQuery();
      const onFetchRecordsComplete = jest.fn().mockResolvedValue(undefined);
      const abortController = new AbortController();

      startFetch(abortController, { onFetchRecordsComplete });
      abortController.abort(AbortReason.CANCELED);
      await waitForNextTick();

      expect(onFetchRecordsComplete).not.toHaveBeenCalled();
    });

    test('should not call onFetchRecordsComplete of a replaced fetch when the newer fetch is cancelled', async () => {
      setEsqlQuery();
      const replacedFetchComplete = jest.fn().mockResolvedValue(undefined);
      const newerFetchComplete = jest.fn().mockResolvedValue(undefined);
      const replacedController = new AbortController();
      const newerController = new AbortController();

      startFetch(replacedController, { onFetchRecordsComplete: replacedFetchComplete });
      replacedController.abort(AbortReason.REPLACED);
      startFetch(newerController, { onFetchRecordsComplete: newerFetchComplete });
      newerController.abort(AbortReason.CANCELED);
      await waitForNextTick();

      // The replaced fetch is still waiting on the shared documents$, which the cancel settles
      expect(replacedFetchComplete).not.toHaveBeenCalled();
      expect(newerFetchComplete).not.toHaveBeenCalled();
    });

    test('should not settle a newer fetch that started before the cancellation was processed', async () => {
      setEsqlQuery();
      const documentsValues = collectValues(subjects.documents$);
      const newerFetch = createDeferred<RecordsFetchResponse>();
      const cancelledController = new AbortController();

      startFetch(cancelledController);
      cancelledController.abort(AbortReason.CANCELED);
      mockfetchEsql.mockReturnValueOnce(newerFetch.promise);
      startFetch(new AbortController());
      await waitForNextTick();

      expect(subjects.documents$.getValue().fetchStatus).toBe(FetchStatus.LOADING);

      newerFetch.resolve({ records: documents });
      await waitForNextTick();
      expect(lastValue(documentsValues)).toEqual(
        expect.objectContaining({ fetchStatus: FetchStatus.PARTIAL, result: documents })
      );
      expect(
        documentsValues.filter(({ fetchStatus }) => fetchStatus === FetchStatus.COMPLETE)
      ).toHaveLength(0);
    });

    test('should not let late partial results of a cancelled query overwrite a newer fetch', async () => {
      setEsqlQuery();
      const documentsValues = collectValues(subjects.documents$);
      // Cancelled after ES returned an async search id: the request resolves later with partial results
      const cancelledFetch = createDeferred<RecordsFetchResponse>();
      const cancelledController = new AbortController();
      const partialRecords = [documents[0]];

      mockfetchEsql.mockReturnValueOnce(cancelledFetch.promise);
      startFetch(cancelledController);
      cancelledController.abort(AbortReason.CANCELED);
      startFetch(new AbortController());
      cancelledFetch.resolve({ records: partialRecords });
      await waitForNextTick();
      expect(documentsValues.find(({ result }) => result === partialRecords)).toBeUndefined();
      expect(lastValue(documentsValues).fetchStatus).toBe(FetchStatus.LOADING);
    });
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
      fetchMoreDocuments(deps);
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
      fetchMoreDocuments(deps);
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
      deps.internalState.dispatch(
        internalStateActions.updateAppState({
          tabId: deps.getCurrentTab().id,
          appState: { query },
        })
      );
      fetchAll(deps);
      deps.abortController.abort();
      await waitForNextTick();

      expect((await collect()).find(({ error }) => error)).toBeUndefined();
    });
  });
});
