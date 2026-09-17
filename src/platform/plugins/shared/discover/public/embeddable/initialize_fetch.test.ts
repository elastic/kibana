/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Observable, of } from 'rxjs';

import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import type { EsqlSource } from '@kbn/data-source';

import { discoverServiceMock } from '../__mocks__/services';
import { initializeFetch } from './initialize_fetch';
import { getMockedSearchApi } from './__mocks__/get_mocked_api';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../context_awareness';
import { fetchEsql } from '../application/main/data_fetching/fetch_esql';
import { resolveEsqlSource } from '../application/main/data_fetching/resolve_esql_source';

jest.mock('../application/main/data_fetching/fetch_esql');
jest.mock('../application/main/data_fetching/resolve_esql_source');

const mockFetchEsql = fetchEsql as jest.MockedFunction<typeof fetchEsql>;
const mockResolveEsqlSource = resolveEsqlSource as jest.MockedFunction<typeof resolveEsqlSource>;

describe('initialize fetch', () => {
  const searchSource = createSearchSourceMock({ index: dataViewMock });
  const savedSearch = {
    id: 'mock-id',
    title: 'saved search',
    sort: [['message', 'asc']] as Array<[string, string]>,
    searchSource,
    viewMode: VIEW_MODE.DOCUMENT_LEVEL,
    managed: false,
  };

  const {
    api: mockedApi,
    stateManager,
    setters,
  } = getMockedSearchApi({ searchSource, savedSearch });
  const refreshTrigger$ = new BehaviorSubject<void>(undefined);

  const waitOneTick = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeAll(async () => {
    initializeFetch({
      api: mockedApi,
      stateManager,
      discoverServices: discoverServiceMock,
      scopedProfilesManager: discoverServiceMock.profilesManager.createScopedProfilesManager({
        scopedEbtManager: discoverServiceMock.ebtManager.createScopedEBTManager(),
        toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
      }),
      refreshTrigger$,
      ...setters,
      setApproximationApplied: jest.fn(),
    });
    await waitOneTick();
  });

  it('should set state via state manager', async () => {
    expect(stateManager.rows.getValue()).toEqual([]);
    expect(stateManager.totalHitCount.getValue()).toEqual(0);

    searchSource.fetch$ = jest.fn().mockImplementation(() =>
      of({
        rawResponse: {
          hits: {
            hits: [
              { _id: '1', _index: dataViewMock.id },
              { _id: '2', _index: dataViewMock.id },
            ],
            total: 2,
          },
        },
      })
    );
    mockedApi.savedSearch$.next(savedSearch); // reload
    await waitOneTick();

    expect(stateManager.rows.getValue()).toEqual(
      [
        { _id: '1', _index: dataViewMock.id },
        { _id: '2', _index: dataViewMock.id },
      ].map((hit) => buildDataTableRecord(hit, dataViewMock))
    );
    expect(stateManager.totalHitCount.getValue()).toEqual(2);
    expect(stateManager.inspectorAdapters.getValue().requests).toBeDefined();
  });

  it('should catch and emit error', async () => {
    expect(mockedApi.blockingError$.getValue()).toBeUndefined();
    searchSource.fetch$ = jest.fn().mockImplementation(
      () =>
        new Observable(() => {
          throw new Error('Search failed');
        })
    );
    mockedApi.savedSearch$.next(savedSearch);
    await waitOneTick();
    expect(mockedApi.blockingError$.getValue()).toBeDefined();
    expect(mockedApi.blockingError$.getValue()?.message).toBe('Search failed');
  });

  it('should correctly handle aborted requests', async () => {
    const abortSignals: AbortSignal[] = [];

    searchSource.fetch$ = jest.fn().mockImplementation(
      (options) =>
        new Observable(() => {
          abortSignals.push(options.abortSignal);
        })
    );

    mockedApi.savedSearch$.next(savedSearch); // reload
    await waitOneTick(); // allow first request to start

    mockedApi.savedSearch$.next(savedSearch); // reload a second time to trigger abort
    await waitOneTick();
    expect(abortSignals[0].aborted).toBe(true); // first request should have been aborted
    expect(abortSignals[1].aborted).toBe(false); // second request was not aborted

    mockedApi.savedSearch$.next(savedSearch); // reload a third time
    await waitOneTick();
    expect(abortSignals[1].aborted).toBe(true); // second request should have been aborted
    expect(abortSignals[2].aborted).toBe(false); // third request was not aborted
  });

  it('should fetch again when refresh trigger emits', async () => {
    const fetchMock = jest.fn().mockImplementation(() =>
      of({
        rawResponse: {
          hits: {
            hits: [{ _id: '1', _index: dataViewMock.id }],
            total: 1,
          },
        },
      })
    );
    searchSource.fetch$ = fetchMock;

    mockedApi.savedSearch$.next(savedSearch);
    await waitOneTick();
    const callsBeforeRefresh = fetchMock.mock.calls.length;

    refreshTrigger$.next(undefined);
    await waitOneTick();

    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBeforeRefresh);
  });
});

const createMockEsqlSourceForFetch = (columnNames: string[]): EsqlSource => {
  const columns = columnNames.map((name) => ({
    name,
    type: 'string' as const,
    esType: 'keyword',
  }));
  const source = {
    kind: 'esql' as const,
    id: `esql-mock-${columnNames.join('-')}`,
    query: 'FROM logs-*',
    title: 'logs-*',
    timeFieldName: '@timestamp',
    getColumns: () => columns,
    getColumn: (name: string) => columns.find((column) => column.name === name),
  };
  return source as unknown as EsqlSource;
};

describe('initialize fetch ES|QL', () => {
  const waitOneTick = () => new Promise((resolve) => setTimeout(resolve, 0));

  const setup = () => {
    const searchSource = createSearchSourceMock({
      index: dataViewMock,
      query: { esql: 'FROM logs-* | LIMIT 10' },
    });
    const savedSearch = {
      id: 'esql-id',
      title: 'esql saved search',
      sort: [] as Array<[string, string]>,
      searchSource,
      viewMode: VIEW_MODE.DOCUMENT_LEVEL,
      managed: false,
    };
    const mocked = getMockedSearchApi({ searchSource, savedSearch });
    const esqlSource$ = new BehaviorSubject<EsqlSource | undefined>(undefined);
    const refreshTrigger$ = new BehaviorSubject<void>(undefined);

    mockResolveEsqlSource.mockResolvedValue({
      esqlSource: createMockEsqlSourceForFetch(['message']),
      dataView: dataViewMock,
    });
    mockFetchEsql.mockResolvedValue({
      records: [{ id: '1', raw: {}, flattened: {} }],
      esqlColumns: [],
      interceptedWarnings: [],
      esqlHeaderWarning: undefined,
      approximationApplied: false,
    } as Awaited<ReturnType<typeof fetchEsql>>);

    initializeFetch({
      api: mocked.api,
      stateManager: mocked.stateManager,
      discoverServices: discoverServiceMock,
      scopedProfilesManager: discoverServiceMock.profilesManager.createScopedProfilesManager({
        scopedEbtManager: discoverServiceMock.ebtManager.createScopedEBTManager(),
        toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
      }),
      refreshTrigger$,
      ...mocked.setters,
      setApproximationApplied: jest.fn(),
      esqlSource$,
    });

    return { mocked, esqlSource$, refreshTrigger$, savedSearch, searchSource };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves EsqlSource and publishes columnsMeta from LIMIT 0 columns', async () => {
    const { mocked, esqlSource$ } = setup();
    await waitOneTick();
    await waitOneTick();

    expect(mockResolveEsqlSource).toHaveBeenCalledTimes(1);
    expect(mockFetchEsql).toHaveBeenCalledTimes(1);
    expect(mocked.stateManager.columnsMeta.getValue()).toEqual({
      message: { type: 'string', esType: 'keyword' },
    });
    expect(esqlSource$.getValue()?.getColumns().map((column) => column.name)).toEqual(['message']);
  });

  it('does not re-resolve EsqlSource when the query identity is unchanged', async () => {
    const { mocked, savedSearch } = setup();
    await waitOneTick();
    await waitOneTick();
    expect(mockResolveEsqlSource).toHaveBeenCalledTimes(1);

    mocked.api.savedSearch$.next(savedSearch);
    await waitOneTick();
    await waitOneTick();

    expect(mockResolveEsqlSource).toHaveBeenCalledTimes(1);
    expect(mockFetchEsql).toHaveBeenCalledTimes(2);
  });

  it('re-resolves EsqlSource when the time range changes', async () => {
    const { mocked } = setup();
    await waitOneTick();
    await waitOneTick();
    expect(mockResolveEsqlSource).toHaveBeenCalledTimes(1);

    mocked.api.timeRange$.next({ from: 'now-1h', to: 'now' });
    await waitOneTick();
    await waitOneTick();

    expect(mockResolveEsqlSource).toHaveBeenCalledTimes(2);
  });
});

