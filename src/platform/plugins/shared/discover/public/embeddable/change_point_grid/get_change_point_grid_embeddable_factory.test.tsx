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
import type { PhaseEvent, PresentationContainer } from '@kbn/presentation-publishing';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { ACTION_EXPLORE_DATA } from '../constants';
import { discoverServiceMock } from '../../__mocks__/services';
import { ChangePointGridRenderer } from './change_point_grid_renderer';
import { getChangePointGridEmbeddableFactory } from './get_change_point_grid_embeddable_factory';
import { initializeChangePointGridFetch } from './initialize_change_point_grid_fetch';

jest.mock('./initialize_change_point_grid_fetch', () => ({
  initializeChangePointGridFetch: jest.fn(() => ({ cleanup: jest.fn() })),
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
    expect(api.dataViews$.getValue()).toEqual([dataView]);

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
});
