/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { FetchStatus } from '../../types';
import { BehaviorSubject, firstValueFrom, Subject } from 'rxjs';
import { reduce } from 'rxjs/operators';
import { SearchSource } from '@kbn/data-plugin/public';
import { RequestAdapter } from '@kbn/inspector-plugin';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { ReduxLikeStateContainer } from '@kbn/kibana-utils-plugin/common';
import { AppState } from '../services/discover_state';
import { discoverServiceMock } from '../../../__mocks__/services';
import { fetchAll } from './fetch_all';
import {
  DataAvailableFieldsMsg,
  DataChartsMessage,
  DataDocumentsMsg,
  DataMainMsg,
  DataTotalHitsMsg,
  SavedSearchData,
} from './use_saved_search';

import { fetchDocuments } from './fetch_documents';
import { fetchChart } from './fetch_chart';
import { fetchTotalHits } from './fetch_total_hits';

jest.mock('./fetch_documents', () => ({
  fetchDocuments: jest.fn().mockResolvedValue([]),
}));

jest.mock('./fetch_chart', () => ({
  fetchChart: jest.fn(),
}));

jest.mock('./fetch_total_hits', () => ({
  fetchTotalHits: jest.fn(),
}));

const mockFetchDocuments = fetchDocuments as unknown as jest.MockedFunction<typeof fetchDocuments>;
const mockFetchTotalHits = fetchTotalHits as unknown as jest.MockedFunction<typeof fetchTotalHits>;
const mockFetchChart = fetchChart as unknown as jest.MockedFunction<typeof fetchChart>;

function subjectCollector<T>(subject: Subject<T>): () => Promise<T[]> {
  const promise = firstValueFrom(
    subject.pipe(reduce((history, value) => history.concat([value]), [] as T[]))
  );

  return () => {
    subject.complete();
    return promise;
  };
}

describe('test fetchAll', () => {
  let subjects: SavedSearchData;
  let deps: Parameters<typeof fetchAll>[3];
  let searchSource: SearchSource;
  beforeEach(() => {
    subjects = {
      main$: new BehaviorSubject<DataMainMsg>({ fetchStatus: FetchStatus.UNINITIALIZED }),
      documents$: new BehaviorSubject<DataDocumentsMsg>({ fetchStatus: FetchStatus.UNINITIALIZED }),
      totalHits$: new BehaviorSubject<DataTotalHitsMsg>({ fetchStatus: FetchStatus.UNINITIALIZED }),
      charts$: new BehaviorSubject<DataChartsMessage>({ fetchStatus: FetchStatus.UNINITIALIZED }),
      availableFields$: new BehaviorSubject<DataAvailableFieldsMsg>({
        fetchStatus: FetchStatus.UNINITIALIZED,
      }),
    };
    deps = {
      appStateContainer: {
        getState: () => {
          return { interval: 'auto' };
        },
      } as ReduxLikeStateContainer<AppState>,
      abortController: new AbortController(),
      data: discoverServiceMock.data,
      inspectorAdapters: { requests: new RequestAdapter() },
      searchSessionId: '123',
      initialFetchStatus: FetchStatus.UNINITIALIZED,
      useNewFieldsApi: true,
      savedSearch: savedSearchMock,
      services: discoverServiceMock,
    };
    searchSource = savedSearchMock.searchSource.createChild();

    mockFetchDocuments.mockReset().mockResolvedValue([]);
    mockFetchTotalHits.mockReset().mockResolvedValue(42);
    mockFetchChart
      .mockReset()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValue({ totalHits: 42, chartData: {} as any, bucketInterval: {} });
  });

  test('changes of fetchStatus when starting with FetchStatus.UNINITIALIZED', async () => {
    const stateArr: FetchStatus[] = [];

    subjects.main$.subscribe((value) => stateArr.push(value.fetchStatus));

    await fetchAll(subjects, searchSource, false, deps);

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
    mockFetchDocuments.mockResolvedValue(hits);
    await fetchAll(subjects, searchSource, false, deps);
    expect(await collect()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      { fetchStatus: FetchStatus.LOADING },
      { fetchStatus: FetchStatus.COMPLETE, result: hits },
    ]);
  });

  test('emits loading and hit count on totalHits$ correctly', async () => {
    const collect = subjectCollector(subjects.totalHits$);
    const hits = [
      { _id: '1', _index: 'logs' },
      { _id: '2', _index: 'logs' },
    ];
    searchSource.getField('index')!.isTimeBased = () => false;
    mockFetchDocuments.mockResolvedValue(hits);
    mockFetchTotalHits.mockResolvedValue(42);
    await fetchAll(subjects, searchSource, false, deps);
    expect(await collect()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      { fetchStatus: FetchStatus.LOADING },
      { fetchStatus: FetchStatus.PARTIAL, result: 2 },
      { fetchStatus: FetchStatus.COMPLETE, result: 42 },
    ]);
  });

  test('emits loading and chartData on charts$ correctly', async () => {
    const collect = subjectCollector(subjects.charts$);
    searchSource.getField('index')!.isTimeBased = () => true;
    await fetchAll(subjects, searchSource, false, deps);
    expect(await collect()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      { fetchStatus: FetchStatus.LOADING },
      { fetchStatus: FetchStatus.COMPLETE, bucketInterval: {}, chartData: {} },
    ]);
  });

  test('should use charts query to fetch total hit count when chart is visible', async () => {
    const collect = subjectCollector(subjects.totalHits$);
    searchSource.getField('index')!.isTimeBased = () => true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFetchChart.mockResolvedValue({ bucketInterval: {}, chartData: {} as any, totalHits: 32 });
    await fetchAll(subjects, searchSource, false, deps);
    expect(await collect()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      { fetchStatus: FetchStatus.LOADING },
      { fetchStatus: FetchStatus.PARTIAL, result: 0 }, // From documents query
      { fetchStatus: FetchStatus.COMPLETE, result: 32 },
    ]);
    expect(mockFetchTotalHits).not.toHaveBeenCalled();
  });

  test('should only fail totalHits$ query not main$ for error from that query', async () => {
    const collectTotalHits = subjectCollector(subjects.totalHits$);
    const collectMain = subjectCollector(subjects.main$);
    searchSource.getField('index')!.isTimeBased = () => false;
    mockFetchTotalHits.mockRejectedValue({ msg: 'Oh noes!' });
    mockFetchDocuments.mockResolvedValue([{ _id: '1', _index: 'logs' }]);
    await fetchAll(subjects, searchSource, false, deps);
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
      { fetchStatus: FetchStatus.COMPLETE, foundDocuments: true },
    ]);
  });

  test('should not set COMPLETE if an ERROR has been set on main$', async () => {
    const collectMain = subjectCollector(subjects.main$);
    searchSource.getField('index')!.isTimeBased = () => false;
    mockFetchDocuments.mockRejectedValue({ msg: 'This query failed' });
    await fetchAll(subjects, searchSource, false, deps);
    expect(await collectMain()).toEqual([
      { fetchStatus: FetchStatus.UNINITIALIZED },
      { fetchStatus: FetchStatus.LOADING },
      { fetchStatus: FetchStatus.PARTIAL }, // From totalHits query
      { fetchStatus: FetchStatus.ERROR, error: { msg: 'This query failed' } },
      // Here should be no COMPLETE coming anymore
    ]);
  });
});
