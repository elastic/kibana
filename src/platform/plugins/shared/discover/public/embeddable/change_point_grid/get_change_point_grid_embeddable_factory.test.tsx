/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen, waitFor } from '@testing-library/react';
import { mockInitializeDrilldownsManager } from '@kbn/embeddable-plugin/public/mocks';
import {
  apiHasUniqueId,
  apiPublishesEsql,
  apiPublishesTimeRange,
  getTitle,
  UNSAVED_CHANGES_DEBOUNCE,
  type HasLastSavedChildState,
  type PhaseEvent,
  type PresentationContainer,
} from '@kbn/presentation-publishing';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { createStartContractMock } from '../../__mocks__/start_contract';
import { ExploreChangePointGridInDiscoverAction } from '../actions/explore_change_point_grid_in_discover_action';
import { ACTION_EXPLORE_DATA } from '../constants';
import { discoverServiceMock } from '../../__mocks__/services';
import { ChangePointGridRenderer } from './change_point_grid_renderer';
import { getChangePointGridEmbeddableFactory } from './get_change_point_grid_embeddable_factory';
import { initializeChangePointGridFetch } from './initialize_change_point_grid_fetch';

const mockCancelSearch = jest.fn();
jest.mock('./initialize_change_point_grid_fetch', () => ({
  initializeChangePointGridFetch: jest.fn(() => ({
    cleanup: jest.fn(),
    cancelRequests: mockCancelSearch,
  })),
}));

jest.mock('./change_point_grid_renderer', () => ({
  ChangePointGridRenderer: jest.fn(() => <div data-test-subj="changePointGridRenderer" />),
}));

describe('getChangePointGridEmbeddableFactory', () => {
  it('shows a loading indicator until the first results arrive', async () => {
    const parentApi = {} as PresentationContainer;
    const uuid = 'change-point-grid';
    const factory = getChangePointGridEmbeddableFactory({
      discoverServices: discoverServiceMock,
    });
    const { api, Component } = await factory.buildEmbeddable({
      initializeDrilldownsManager: mockInitializeDrilldownsManager,
      uuid,
      parentApi,
      initialState: {
        esql: 'FROM logs-* | CHANGE_POINT count ON @timestamp',
        apply_dashboard_context: true,
      },
      finalizeApi: (apiRegistration) => ({
        ...apiRegistration,
        uuid,
        type: factory.type,
        parentApi,
        phase$: new BehaviorSubject<PhaseEvent | undefined>(undefined),
      }),
    });

    expect(api.esql$.getValue()).toEqual([
      { esql: 'FROM logs-* | CHANGE_POINT count ON @timestamp' },
    ]);
    expect(api.approximationApplied$.getValue()).toBeUndefined();
    expect(api.applyDashboardContext).toBe(true);
    expect(api.defaultTitle$?.getValue()).toBe('Change points in logs-*');
    expect(api.serializeState()).toEqual({
      esql: 'FROM logs-* | CHANGE_POINT count ON @timestamp',
      apply_dashboard_context: true,
      time_range: undefined,
    });
    expect(api.disabledActionIds$?.getValue()).toEqual([ACTION_EXPLORE_DATA]);

    const [{ setDataViews }] = jest.mocked(initializeChangePointGridFetch).mock.calls[0];
    const dataView = { id: 'logs-*' };
    setDataViews([dataView as never]);
    expect(api.dataSources$.getValue()).toEqual([dataView]);

    render(<Component />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    const [{ cards$, searchContext$ }] = jest.mocked(initializeChangePointGridFetch).mock.calls[0];
    searchContext$.next({
      timeRange: { from: 'now-15m', to: 'now' },
      filters: [],
      esqlVariables: [],
      isApproximate: false,
      projectRouting: undefined,
    });
    cards$.next([]);

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('changePointGridRenderer')).toBeInTheDocument();
    expect(jest.mocked(ChangePointGridRenderer).mock.calls[0][0].fetchParams.timeRange).toEqual({
      from: expect.stringMatching(/Z$/),
      to: expect.stringMatching(/Z$/),
    });
  });

  it('publishes a custom time range and serializes changes from panel settings', async () => {
    const parentApi = {} as PresentationContainer;
    const uuid = 'change-point-grid';
    const factory = getChangePointGridEmbeddableFactory({
      discoverServices: discoverServiceMock,
    });
    const { api } = await factory.buildEmbeddable({
      initializeDrilldownsManager: mockInitializeDrilldownsManager,
      uuid,
      parentApi,
      initialState: {
        esql: 'FROM logs-* | CHANGE_POINT count ON @timestamp',
        apply_dashboard_context: false,
        time_range: { from: '2020-01-01T00:00:00.000Z', to: '2020-01-02T00:00:00.000Z' },
      },
      finalizeApi: (apiRegistration) => ({
        ...apiRegistration,
        uuid,
        type: factory.type,
        parentApi,
        phase$: new BehaviorSubject<PhaseEvent | undefined>(undefined),
      }),
    });

    expect(api.timeRange$?.getValue()).toEqual({
      from: '2020-01-01T00:00:00.000Z',
      to: '2020-01-02T00:00:00.000Z',
    });

    const nextRange = { from: 'now-1h', to: 'now' };
    api.setTimeRange(nextRange);
    expect(api.serializeState().time_range).toEqual(nextRange);

    api.setTimeRange(undefined);
    expect(api.serializeState().time_range).toBeUndefined();
  });

  it('publishes chart rendering and clears it when a search starts', async () => {
    const parentApi = {} as PresentationContainer;
    const uuid = 'change-point-grid';
    const factory = getChangePointGridEmbeddableFactory({
      discoverServices: discoverServiceMock,
    });
    const { api, Component } = await factory.buildEmbeddable({
      initializeDrilldownsManager: mockInitializeDrilldownsManager,
      uuid,
      parentApi,
      initialState: {
        esql: 'FROM logs-* | CHANGE_POINT count ON @timestamp',
        apply_dashboard_context: true,
      },
      finalizeApi: (apiRegistration) => ({
        ...apiRegistration,
        uuid,
        type: factory.type,
        parentApi,
        phase$: new BehaviorSubject<PhaseEvent | undefined>(undefined),
      }),
    });

    expect(api.rendered$.getValue()).toBe(false);
    const [{ setDataLoading, cards$, searchContext$ }] = jest
      .mocked(initializeChangePointGridFetch)
      .mock.calls.at(-1)!;
    searchContext$.next({
      timeRange: { from: '2020-01-01T00:00:00.000Z', to: '2020-01-02T00:00:00.000Z' },
      filters: [],
      esqlVariables: [],
      isApproximate: false,
      projectRouting: undefined,
    });
    cards$.next([]);
    render(<Component />);

    await waitFor(() => {
      expect(jest.mocked(ChangePointGridRenderer).mock.calls.at(-1)?.[0].onRenderedChange).toEqual(
        expect.any(Function)
      );
    });
    jest.mocked(ChangePointGridRenderer).mock.calls.at(-1)?.[0].onRenderedChange(true);
    expect(api.rendered$.getValue()).toBe(true);

    setDataLoading(true);
    expect(api.rendered$.getValue()).toBe(false);
    setDataLoading(false);
    expect(api.rendered$.getValue()).toBe(false);
  });

  it('keeps loading while mini charts load and cancels them with the search', async () => {
    mockCancelSearch.mockClear();
    const parentApi = {} as PresentationContainer;
    const uuid = 'change-point-grid';
    const factory = getChangePointGridEmbeddableFactory({
      discoverServices: discoverServiceMock,
    });
    const { api, Component } = await factory.buildEmbeddable({
      initializeDrilldownsManager: mockInitializeDrilldownsManager,
      uuid,
      parentApi,
      initialState: {
        esql: 'FROM logs-* | CHANGE_POINT count ON @timestamp',
        apply_dashboard_context: true,
      },
      finalizeApi: (apiRegistration) => ({
        ...apiRegistration,
        uuid,
        type: factory.type,
        parentApi,
        phase$: new BehaviorSubject<PhaseEvent | undefined>(undefined),
      }),
    });
    const [{ setDataLoading, cards$, searchContext$ }] = jest
      .mocked(initializeChangePointGridFetch)
      .mock.calls.at(-1)!;
    searchContext$.next({
      timeRange: { from: '2020-01-01T00:00:00.000Z', to: '2020-01-02T00:00:00.000Z' },
      filters: [],
      esqlVariables: [],
      isApproximate: false,
      projectRouting: undefined,
    });
    cards$.next([]);
    render(<Component />);
    await waitFor(() => {
      expect(jest.mocked(ChangePointGridRenderer).mock.calls.at(-1)?.[0].registerChartApi).toEqual(
        expect.any(Function)
      );
    });
    const { registerChartApi } = jest.mocked(ChangePointGridRenderer).mock.calls.at(-1)![0];

    const loadingChart = { cancelRequests: jest.fn(), dataLoading$: new BehaviorSubject(true) };
    const removedChart = { cancelRequests: jest.fn(), dataLoading$: new BehaviorSubject(false) };
    const unregisterLoadingChart = registerChartApi!(loadingChart);
    registerChartApi!(removedChart)();

    setDataLoading(false);
    expect(api.dataLoading$.getValue()).toBe(true);

    api.cancelRequests();
    expect(mockCancelSearch).toHaveBeenCalledTimes(1);
    expect(loadingChart.cancelRequests).toHaveBeenCalledTimes(1);
    expect(removedChart.cancelRequests).not.toHaveBeenCalled();
    expect(api.rendered$.getValue()).toBe(true);

    loadingChart.dataLoading$.next(false);
    expect(api.dataLoading$.getValue()).toBe(false);

    loadingChart.dataLoading$.next(true);
    expect(api.dataLoading$.getValue()).toBe(true);
    unregisterLoadingChart();
    expect(api.dataLoading$.getValue()).toBe(false);
  });

  it('publishes configuration, updates query and default title in place, and preserves an explicit title', async () => {
    const parentApi = {} as PresentationContainer;
    const uuid = 'change-point-grid';
    const factory = getChangePointGridEmbeddableFactory({
      discoverServices: discoverServiceMock,
    });
    const initialConfig = {
      mode: 'form' as const,
      data_view_id: 'logs-dv',
      aggregation_function: 'avg' as const,
      metric_field: 'bytes',
    };
    const { api, Component } = await factory.buildEmbeddable({
      initializeDrilldownsManager: mockInitializeDrilldownsManager,
      uuid,
      parentApi,
      initialState: {
        esql: 'FROM logs-* | CHANGE_POINT count ON @timestamp',
        apply_dashboard_context: true,
        configuration: initialConfig,
      },
      finalizeApi: (apiRegistration) => ({
        ...apiRegistration,
        uuid,
        type: factory.type,
        parentApi,
        phase$: new BehaviorSubject<PhaseEvent | undefined>(undefined),
      }),
    });

    expect(api.configuration$.getValue()).toEqual(initialConfig);
    expect(getTitle(api)).toBe('Change points in logs-*');

    const [{ cards$, searchContext$, esqlQuery$ }] = jest
      .mocked(initializeChangePointGridFetch)
      .mock.calls.at(-1)!;
    const observedQueries: string[] = [];
    const sub = esqlQuery$!.subscribe((query) => observedQueries.push(query));

    searchContext$.next({
      timeRange: { from: '2020-01-01T00:00:00.000Z', to: '2020-01-02T00:00:00.000Z' },
      filters: [],
      esqlVariables: [],
      isApproximate: false,
      projectRouting: undefined,
    });
    cards$.next([]);
    render(<Component />);

    const nextEsql = 'FROM metrics-* | CHANGE_POINT sum_latency ON bucket';
    api.updateChangePointQuery({
      esql: nextEsql,
      configuration: { mode: 'esql' },
    });

    expect(observedQueries).toEqual(['FROM logs-* | CHANGE_POINT count ON @timestamp', nextEsql]);
    expect(api.esql$.getValue()).toEqual([{ esql: nextEsql }]);
    expect(api.configuration$.getValue()).toEqual({ mode: 'esql' });
    expect(api.defaultTitle$?.getValue()).toBe('Change points in metrics-*');
    expect(getTitle(api)).toBe('Change points in metrics-*');
    expect(api.serializeState()).toEqual({
      esql: nextEsql,
      apply_dashboard_context: true,
      time_range: undefined,
      configuration: { mode: 'esql' },
    });

    await waitFor(() => {
      expect(jest.mocked(ChangePointGridRenderer).mock.calls.at(-1)?.[0].esql).toBe(nextEsql);
    });

    api.setTitle('Custom panel title');
    api.updateChangePointQuery({
      esql: 'FROM traces-* | CHANGE_POINT max_duration ON bucket',
      configuration: { mode: 'esql' },
    });
    expect(api.defaultTitle$?.getValue()).toBe('Change points in traces-*');
    expect(getTitle(api)).toBe('Custom panel title');

    sub.unsubscribe();
  });

  it('does not mark an existing panel dirty on mount or reapply, and marks it dirty only after an actual update', async () => {
    jest.useFakeTimers();
    try {
      const savedState = {
        esql: 'FROM logs-* | CHANGE_POINT count ON @timestamp',
        apply_dashboard_context: true,
      };
      const lastSavedState$ = new BehaviorSubject(savedState);
      const parentApi = {
        lastSavedStateForChild$: () => lastSavedState$,
        getLastSavedStateForChild: () => savedState,
      } as unknown as PresentationContainer & HasLastSavedChildState;
      const uuid = 'change-point-grid';
      const factory = getChangePointGridEmbeddableFactory({
        discoverServices: discoverServiceMock,
      });
      const { api } = await factory.buildEmbeddable({
        initializeDrilldownsManager: mockInitializeDrilldownsManager,
        uuid,
        parentApi,
        initialState: savedState,
        finalizeApi: (apiRegistration) => ({
          ...apiRegistration,
          uuid,
          type: factory.type,
          parentApi,
          phase$: new BehaviorSubject<PhaseEvent | undefined>(undefined),
        }),
      });

      const stateChanges = jest.fn();
      const configChanges = jest.fn();
      let latestUnsaved: boolean | undefined;
      const stateChangeSub = api.anyStateChange$.subscribe(stateChanges);
      const configChangeSub = api.configuration$.subscribe(configChanges);
      const unsavedSub = api.hasUnsavedChanges$.subscribe((value) => {
        latestUnsaved = value;
      });
      configChanges.mockClear();

      expect(api.configuration$.getValue()).toBeUndefined();
      expect(stateChanges).not.toHaveBeenCalled();

      jest.advanceTimersByTime(UNSAVED_CHANGES_DEBOUNCE + 10);
      expect(latestUnsaved).toBe(false);

      api.applySerializedState(savedState);
      expect(configChanges).not.toHaveBeenCalled();
      jest.advanceTimersByTime(UNSAVED_CHANGES_DEBOUNCE + 10);
      expect(latestUnsaved).toBe(false);

      api.updateChangePointQuery({
        esql: 'FROM metrics-* | CHANGE_POINT count ON @timestamp',
        configuration: { mode: 'esql' },
      });
      expect(stateChanges).toHaveBeenCalled();
      expect(configChanges).toHaveBeenCalledWith({ mode: 'esql' });
      jest.advanceTimersByTime(UNSAVED_CHANGES_DEBOUNCE + 10);
      expect(latestUnsaved).toBe(true);

      api.applySerializedState(savedState);
      expect(api.defaultTitle$?.getValue()).toBe('Change points in logs-*');
      jest.advanceTimersByTime(UNSAVED_CHANGES_DEBOUNCE + 10);
      expect(latestUnsaved).toBe(false);

      unsavedSub.unsubscribe();
      configChangeSub.unsubscribe();
      stateChangeSub.unsubscribe();
    } finally {
      jest.useRealTimers();
    }
  });

  it('retains per-panel time range, View ES|QL query publication, and Explore in Discover across in-place edits', async () => {
    jest.mocked(discoverServiceMock.locator.navigate).mockClear();
    const parentApi = {} as PresentationContainer;
    const uuid = 'change-point-grid';
    const fixedTimeRange = { from: 'now-7d', to: 'now' };
    const initialEsql = 'FROM logs-* | CHANGE_POINT `avg_bytes` ON bucket';
    const factory = getChangePointGridEmbeddableFactory({
      discoverServices: discoverServiceMock,
    });
    const { api } = await factory.buildEmbeddable({
      initializeDrilldownsManager: mockInitializeDrilldownsManager,
      uuid,
      parentApi,
      initialState: {
        esql: initialEsql,
        apply_dashboard_context: true,
        time_range: fixedTimeRange,
        configuration: {
          mode: 'form',
          data_view_id: 'logs-dv',
          aggregation_function: 'avg',
          metric_field: 'bytes',
        },
      },
      finalizeApi: (apiRegistration) => ({
        ...apiRegistration,
        uuid,
        type: factory.type,
        parentApi,
        phase$: new BehaviorSubject<PhaseEvent | undefined>(undefined),
      }),
    });

    const [{ searchContext$ }] = jest.mocked(initializeChangePointGridFetch).mock.calls.at(-1)!;
    searchContext$.next({
      timeRange: fixedTimeRange,
      filters: [],
      esqlVariables: [],
      isApproximate: false,
      projectRouting: undefined,
    });

    // Per-panel fixed time range / badge contract
    expect(apiPublishesTimeRange(api)).toBe(true);
    expect(api.timeRange$.getValue()).toEqual(fixedTimeRange);

    // View ES|QL query hover action contract
    expect(apiPublishesEsql(api) && apiHasUniqueId(api)).toBe(true);
    expect(api.esql$.getValue()).toEqual([{ esql: initialEsql }]);

    // Explore in Discover action contract
    const exploreAction = new ExploreChangePointGridInDiscoverAction(
      createStartContractMock(),
      discoverServiceMock.locator
    );
    expect(await exploreAction.isCompatible({ embeddable: api })).toBe(true);

    // In-place edit updates ES|QL and Explore in Discover target while keeping per-panel time range
    const editedEsql = 'FROM metrics-* | CHANGE_POINT `max_latency` ON bucket';
    api.updateChangePointQuery({
      esql: editedEsql,
      configuration: { mode: 'esql' },
    });

    expect(api.timeRange$.getValue()).toEqual(fixedTimeRange);
    expect(api.serializeState().time_range).toEqual(fixedTimeRange);
    expect(api.esql$.getValue()).toEqual([{ esql: editedEsql }]);

    await exploreAction.execute({ embeddable: api });
    expect(discoverServiceMock.locator.navigate).toHaveBeenCalledWith({
      query: { esql: editedEsql },
      timeRange: fixedTimeRange,
      esqlApproximation: false,
    });
  });
});
