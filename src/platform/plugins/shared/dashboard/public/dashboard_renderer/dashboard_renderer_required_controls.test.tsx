/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import type { BehaviorSubject } from 'rxjs';
import { render, waitFor } from '@testing-library/react';

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';

import { DEFAULT_DASHBOARD_STATE } from '../../common/default_dashboard_state';
import type { DashboardApi } from '../dashboard_api/types';
import { embeddableService } from '../services/kibana_services';
import { DashboardRenderer } from './dashboard_renderer';

const CONTROL_TYPE = 'fakeRequiredControl';

/** mirrors the data controls: awaiting while required and without selections; `mock` prefix lets `jest.mock` factories use it */
const mockIsAwaiting = (state: { required?: boolean; selected?: string[] } | undefined) =>
  Boolean(state?.required && !state?.selected?.length);

jest.mock('../dashboard_api/load_dashboard_api', () => ({
  // uses the real dashboard API, so that the real layout and filters managers are exercised
  loadDashboardApi: jest.fn(async ({ getCreationOptions }) => {
    const { getInitialInput } = (await getCreationOptions?.()) ?? {};
    const initialState = getInitialInput?.();
    const { getInitiallyAwaitingFilters } = jest.requireActual(
      '../dashboard_api/load_dashboard_api/get_initially_awaiting_filters'
    );
    const { getDashboardApi } = jest.requireActual('../dashboard_api/get_dashboard_api');
    return {
      ...getDashboardApi({
        incomingEmbeddables: [],
        initialState,
        initiallyAwaitingFilters: await getInitiallyAwaitingFilters(initialState.pinned_panels),
      }),
      useControlsIntegration: true,
    };
  }),
}));

jest.mock('./grid', () => ({
  DashboardGrid: () => <div data-test-subj="mockDashboardGrid" />,
}));

jest.mock('./viewport/empty_screen/awaiting_filters_screen', () => ({
  AwaitingFiltersScreen: () => <div data-test-subj="mockAwaitingFiltersScreen" />,
}));

/**
 * Stands in for the real controls renderer: like it, builds the pinned controls from the dashboard's child
 * state, registers their APIs with the dashboard, and never rebuilds a control whose id is unchanged.
 */
jest.mock('@kbn/controls-renderer', () => {
  const { BehaviorSubject: Subject } = jest.requireActual('rxjs');
  const mounted = new Set<string>();
  return {
    __mounted: mounted,
    ControlsRenderer: ({
      controls,
      parentApi,
    }: {
      controls: { controls: Record<string, unknown> };
      parentApi: {
        getSerializedStateForChild: (id: string) => { required?: boolean; selected?: string[] };
        registerChildApi: (api: unknown) => void;
      };
    }) => {
      const idsKey = Object.keys(controls.controls).join(',');
      useEffect(() => {
        const ids = idsKey ? idsKey.split(',') : [];
        ids.forEach((uuid) => {
          if (mounted.has(uuid)) return;
          mounted.add(uuid);
          const awaitingRequiredFilters$ = new Subject(
            mockIsAwaiting(parentApi.getSerializedStateForChild(uuid))
          );
          parentApi.registerChildApi({
            uuid,
            type: 'fakeRequiredControl',
            awaitingRequiredFilters$,
            serializeState: () => parentApi.getSerializedStateForChild(uuid),
            applySerializedState: (state: { required?: boolean; selected?: string[] }) =>
              awaitingRequiredFilters$.next(mockIsAwaiting(state)),
            anyStateChange$: new Subject(undefined),
            latestState$: new Subject(undefined),
          } as unknown as DefaultEmbeddableApi);
        });
      }, [idsKey, parentApi]);
      return <div data-test-subj="mockControlsRenderer">{idsKey}</div>;
    },
  };
});

const stateWithControls = (
  controls: Array<{ id: string; required: boolean; selected?: string[] }>
) =>
  ({
    ...DEFAULT_DASHBOARD_STATE,
    pinned_panels: controls.map(({ id, ...config }, order) => ({
      id,
      type: CONTROL_TYPE,
      config,
      order,
    })),
  } as unknown as DashboardState);

const mountPreview = async (initialState: DashboardState) => {
  let api: DashboardApi | undefined;
  render(
    <DashboardRenderer
      getCreationOptions={() =>
        Promise.resolve({ getInitialInput: () => ({ ...initialState, viewMode: 'view' }) })
      }
      onApiAvailable={(next) => (api = next)}
    />
  );
  await waitFor(() => expect(api).toBeDefined());
  return api as DashboardApi;
};

describe('DashboardRenderer: required pinned controls across setState (history preview)', () => {
  beforeEach(() => {
    jest.requireMock('@kbn/controls-renderer').__mounted.clear();
    jest.spyOn(embeddableService, 'getEmbeddableDefinition').mockResolvedValue({
      type: CONTROL_TYPE,
      isAwaitingFilters: mockIsAwaiting,
    } as unknown as Awaited<ReturnType<typeof embeddableService.getEmbeddableDefinition>>);
  });

  const awaiting = (api: DashboardApi) =>
    (api.awaitingRequiredFilters$ as BehaviorSubject<boolean>).value;

  test('leaves the waiting screen when the same control gets a satisfying selection', async () => {
    const api = await mountPreview(stateWithControls([{ id: 'c1', required: true }]));
    await waitFor(() => expect(awaiting(api)).toBe(true));

    await api.setState(stateWithControls([{ id: 'c1', required: true, selected: ['a'] }]));
    await waitFor(() => expect(awaiting(api)).toBe(false));
  });

  test('leaves the waiting screen when the awaiting control is replaced by a satisfied one', async () => {
    const api = await mountPreview(stateWithControls([{ id: 'c1', required: true }]));
    await waitFor(() => expect(awaiting(api)).toBe(true));

    await api.setState(stateWithControls([{ id: 'c2', required: true, selected: ['a'] }]));
    await waitFor(() => expect(awaiting(api)).toBe(false));
  });

  test('enters the waiting screen when switching to a version whose required control is unsatisfied', async () => {
    const api = await mountPreview(
      stateWithControls([{ id: 'c1', required: true, selected: ['a'] }])
    );
    await waitFor(() => expect(awaiting(api)).toBe(false));

    await api.setState(stateWithControls([{ id: 'c2', required: true }]));
    await waitFor(() => expect(awaiting(api)).toBe(true));
  });
});
