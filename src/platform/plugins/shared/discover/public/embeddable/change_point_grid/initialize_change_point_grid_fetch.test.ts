/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildChangePointCards } from '@kbn/change-point-chart-viewer';
import { fetch$ } from '@kbn/presentation-publishing';
import { ESQLVariableType } from '@kbn/esql-types';
import { BehaviorSubject, Subject } from 'rxjs';
import { fetchEsql } from '../../application/main/data_fetching/fetch_esql';
import { resolveEsqlSource } from '../../application/main/data_fetching/resolve_esql_source';
import type { DiscoverServices } from '../../build_services';
import type { ChangePointGridEmbeddableState } from '../../../server/embeddable/change_point_grid_schema';
import type { ChangePointCardModel } from '@kbn/change-point-chart-viewer';
import { initializeChangePointGridFetch } from './initialize_change_point_grid_fetch';
import type { ChangePointGridSearchRequest } from './resolve_change_point_grid_search_request';

jest.mock('@kbn/presentation-publishing', () => ({
  fetch$: jest.fn(),
}));
jest.mock('@kbn/change-point-chart-viewer', () => ({
  buildChangePointCards: jest.fn(),
}));
jest.mock('../../application/main/data_fetching/fetch_esql', () => ({
  fetchEsql: jest.fn(),
}));
jest.mock('../../application/main/data_fetching/resolve_esql_source', () => ({
  resolveEsqlSource: jest.fn(),
}));

const fetchContext$ = new Subject<unknown>();
const state = {
  esql: 'FROM logs-* | CHANGE_POINT count ON @timestamp',
  apply_dashboard_context: true,
};

const dashboardContext = {
  isReload: false,
  filters: [{ meta: { key: 'status' } }],
  query: { query: 'dashboard', language: 'kuery' },
  timeRange: { from: 'now-15m', to: 'now' },
  esqlVariables: [{ key: 'service', value: 'orders', type: ESQLVariableType.VALUES }],
  searchSessionId: 'session-1',
  projectRouting: 'project-1',
  isApproximate: true,
  timeslice: undefined,
};

describe('initializeChangePointGridFetch', () => {
  const cards$ = new BehaviorSubject<ChangePointCardModel[] | undefined>(undefined);
  const searchContext$ = new BehaviorSubject<ChangePointGridSearchRequest | undefined>(undefined);
  let resolveSearch: (value: unknown) => void;
  let rejectSearch: (error: Error) => void;
  let cleanupFetch: (() => void) | undefined;

  beforeEach(() => {
    jest.mocked(fetch$).mockReturnValue(fetchContext$ as never);
    jest.mocked(resolveEsqlSource).mockResolvedValue({
      esqlSource: { id: 'source-1', kind: 'esql' },
    } as never);
    jest
      .mocked(buildChangePointCards)
      .mockReturnValue([{ entityValues: { host: 'host-1' }, title: 'live' }] as never);
    jest.mocked(fetchEsql).mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          resolveSearch = resolve as (value: unknown) => void;
          rejectSearch = reject;
        })
    );
  });

  const start = (panelState: ChangePointGridEmbeddableState = state) => {
    const setDataLoading = jest.fn();
    const setSearchError = jest.fn();
    const setApproximationApplied = jest.fn();
    const onCardsUpdated = jest.fn();
    const discoverServices = {
      profilesManager: {
        createScopedProfilesManager: jest.fn().mockReturnValue({}),
      },
      ebtManager: { createScopedEBTManager: jest.fn() },
      data: {},
      expressions: {},
      dataSourceService: { unregisterEsqlSource: jest.fn() },
    } as unknown as DiscoverServices;

    const { cleanup } = initializeChangePointGridFetch({
      api: {},
      state: panelState as never,
      discoverServices,
      cards$,
      searchContext$,
      onCardsUpdated,
      setDataLoading,
      setSearchError,
      setApproximationApplied,
    });

    cleanupFetch = cleanup;
    return {
      cleanup,
      setDataLoading,
      setSearchError,
      setApproximationApplied,
      onCardsUpdated,
      discoverServices,
    };
  };

  afterEach(() => {
    cleanupFetch?.();
    cleanupFetch = undefined;
  });

  it('searches with the dashboard context and publishes the latest cards', async () => {
    const { setDataLoading, setApproximationApplied, onCardsUpdated } = start();
    fetchContext$.next(dashboardContext);
    await Promise.resolve();

    expect(setDataLoading).toHaveBeenCalledWith(true);
    expect(jest.mocked(resolveEsqlSource)).toHaveBeenCalledWith(
      expect.objectContaining({
        esql: state.esql,
        timeRange: dashboardContext.timeRange,
        esqlVariables: dashboardContext.esqlVariables,
      })
    );
    expect(jest.mocked(fetchEsql)).toHaveBeenCalled();

    resolveSearch({
      records: [],
      dataSource: { kind: 'esql', id: 'source-1', resultColumns: [] },
      approximationApplied: true,
    });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(jest.mocked(fetchEsql)).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { esql: state.esql },
        inputQuery: dashboardContext.query,
        filters: dashboardContext.filters,
        timeRange: dashboardContext.timeRange,
        esqlApproximation: true,
      })
    );
    expect(setApproximationApplied).toHaveBeenNthCalledWith(1, undefined);
    expect(setApproximationApplied).toHaveBeenLastCalledWith(true);
    expect(cards$.getValue()?.map((card) => card.title)).toEqual(['live']);
    expect(onCardsUpdated).toHaveBeenCalled();
    expect(setDataLoading).toHaveBeenLastCalledWith(false);
  });

  it('publishes at most eight cards and replaces them on the next search', async () => {
    jest
      .mocked(buildChangePointCards)
      .mockReturnValue(
        Array.from({ length: 9 }, (_, index) => ({ title: `card-${index}` })) as never
      );
    start();
    fetchContext$.next(dashboardContext);
    await Promise.resolve();
    resolveSearch({
      records: [],
      dataSource: { kind: 'esql', id: 'source-1', resultColumns: [] },
    });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(cards$.getValue()?.map((card) => card.title)).toEqual(
      Array.from({ length: 8 }, (_, index) => `card-${index}`)
    );

    jest
      .mocked(buildChangePointCards)
      .mockReturnValue([{ title: 'next-0' }, { title: 'next-1' }] as never);
    fetchContext$.next({ ...dashboardContext, isReload: true });
    await Promise.resolve();
    resolveSearch({
      records: [],
      dataSource: { kind: 'esql', id: 'source-1', resultColumns: [] },
    });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(cards$.getValue()?.map((card) => card.title)).toEqual(['next-0', 'next-1']);
  });

  it('cancels the previous request when a newer context arrives', async () => {
    start();
    fetchContext$.next(dashboardContext);
    await Promise.resolve();
    const firstSignal = jest.mocked(fetchEsql).mock.calls[0][0].abortSignal;

    fetchContext$.next({ ...dashboardContext, isReload: true });
    expect(firstSignal?.aborted).toBe(true);
    await Promise.resolve();

    rejectSearch(new Error('aborted'));
    cleanupFetch?.();
    cleanupFetch = undefined;
    expect(jest.mocked(fetchEsql).mock.calls[1][0].abortSignal?.aborted).toBe(true);
  });

  it('discards a stale ES|QL source when resolutions complete out of order', async () => {
    const resolveSources: Array<(value: unknown) => void> = [];
    jest.mocked(resolveEsqlSource).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSources.push(resolve as (value: unknown) => void);
        })
    );
    jest.mocked(fetchEsql).mockClear();
    jest.mocked(fetchEsql).mockResolvedValue({
      records: [],
      dataSource: { kind: 'esql', id: 'source-new', resultColumns: [] },
    } as never);

    const { discoverServices } = start();
    fetchContext$.next(dashboardContext);
    fetchContext$.next({ ...dashboardContext, isReload: true });

    expect(resolveSources).toHaveLength(2);
    resolveSources[1]({ esqlSource: { id: 'source-new', kind: 'esql' } });
    await Promise.resolve();

    expect(jest.mocked(fetchEsql)).toHaveBeenCalledTimes(1);
    expect(jest.mocked(fetchEsql).mock.calls[0][0].esqlSource).toEqual(
      expect.objectContaining({ id: 'source-new' })
    );

    resolveSources[0]({ esqlSource: { id: 'source-old', kind: 'esql' } });
    await Promise.resolve();

    expect(jest.mocked(fetchEsql)).toHaveBeenCalledTimes(1);
    expect(discoverServices.dataSourceService.unregisterEsqlSource).toHaveBeenCalledWith(
      'source-old'
    );

    cleanupFetch?.();
    cleanupFetch = undefined;
    expect(discoverServices.dataSourceService.unregisterEsqlSource).toHaveBeenCalledWith(
      'source-new'
    );
  });

  it('does not search a static panel again until its time range changes', async () => {
    jest.mocked(fetchEsql).mockClear();
    const { setDataLoading } = start({
      ...state,
      apply_dashboard_context: false,
      static_context: {
        query: { expression: 'status:active', language: 'kql' },
      },
    });
    fetchContext$.next(dashboardContext);
    await Promise.resolve();
    expect(jest.mocked(fetchEsql)).toHaveBeenCalledTimes(1);

    fetchContext$.next({ ...dashboardContext, filters: [], searchSessionId: 'session-2' });
    await Promise.resolve();
    expect(jest.mocked(fetchEsql)).toHaveBeenCalledTimes(1);
    expect(setDataLoading).toHaveBeenCalledTimes(1);

    fetchContext$.next({ ...dashboardContext, timeRange: { from: 'now-1h', to: 'now' } });
    await Promise.resolve();
    expect(jest.mocked(fetchEsql)).toHaveBeenCalledTimes(2);
    expect(jest.mocked(fetchEsql).mock.calls[1][0].timeRange).toEqual({
      from: 'now-1h',
      to: 'now',
    });
  });
});
