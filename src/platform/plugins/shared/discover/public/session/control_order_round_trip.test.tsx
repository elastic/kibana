/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import {
  ControlGroupRenderer,
  type ControlGroupRendererApi,
  type ControlPanelsState,
} from '@kbn/control-group-renderer';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { setStubKibanaServices } from '@kbn/embeddable-plugin/public/mocks';
import {
  registerEmbeddablePublicDefinition,
  type EmbeddablePublicDefinition,
} from '@kbn/embeddable-plugin/public/react_embeddable_system';
import { getDiscoverInternalStateMock } from '../__mocks__/discover_state.mock';
import { DiscoverToolkitTestProvider } from '../__mocks__/test_provider';
import { useESQLVariables } from '../application/main/components/top_nav/use_esql_variables';
import {
  internalStateActions,
  selectHasUnsavedChanges,
} from '../application/main/state_management/redux';
import type { DiscoverSessionClient } from './api_client';
import { createDiscoverSessionPersistence } from './persistence';
import { fromDiscoverSessionApiResponse } from './state_adapter';

describe('control order after saving a Discover session', () => {
  beforeAll(() => {
    setStubKibanaServices();
    registerEmbeddablePublicDefinition(ESQL_CONTROL, async () => testControlFactory);
  });

  it.each([
    { path: 'legacy', useHttpApi: false },
    { path: 'HTTP', useHttpApi: true },
  ])('does not mark unchanged controls as unsaved after a $path save', async ({ useHttpApi }) => {
    const toolkit = getDiscoverInternalStateMock();
    const { services, internalState, runtimeStateManager } = toolkit;
    const controls: ControlPanelsState<OptionsListESQLControlState> = Object.fromEntries(
      ['first', 'middle', 'last'].map((id, order) => [
        id,
        { type: ESQL_CONTROL, width: 'medium', grow: true, ...controlConfig, order },
      ])
    );
    const savedResponse: Awaited<ReturnType<DiscoverSessionClient['upsert']>> = {
      id: 'session-id',
      meta: { managed: false },
      data: {
        title: 'Controls',
        description: '',
        tags: [],
        tabs: [
          {
            id: 'tab-id',
            label: 'ES|QL',
            data_source: { type: 'esql', query: 'FROM logs-*' },
            sort: [],
            column_order: [],
            hide_chart: true,
            hide_table: false,
            chart_interval: 'auto',
            breakdown_field: '',
            control_panels: ['first', 'last'].map((id) => ({
              id,
              type: ESQL_CONTROL,
              width: 'medium',
              grow: true,
              config: controlConfig,
            })),
          },
        ],
      },
    };
    const initialSession = fromDiscoverSessionApiResponse(savedResponse);
    initialSession.tabs[0].controlGroupJson = JSON.stringify(controls);
    await toolkit.initializeTabs({ persistedDiscoverSession: initialSession });
    await toolkit.initializeSingleTab({ tabId: 'tab-id' });

    const apiClient: jest.Mocked<DiscoverSessionClient> = {
      get: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn().mockResolvedValue(savedResponse),
    };
    const legacySave = jest
      .spyOn(services.savedSearch, 'saveDiscoverSession')
      .mockImplementation(async (session) => ({ ...session, id: 'session-id', managed: false }));
    const persistence = createDiscoverSessionPersistence({
      apiClient,
      legacyClient: services.savedSearch,
      useHttpApi,
    });
    jest.spyOn(services.discoverSessionPersistence, 'save').mockImplementation(persistence.save);

    const onApiAvailable = jest.fn<void, [ControlGroupRendererApi]>();
    render(
      <DiscoverToolkitTestProvider toolkit={toolkit}>
        <ControlGroupRenderer
          onApiAvailable={onApiAvailable}
          getCreationOptions={async () => ({
            initialState: { initialChildControlState: controls },
          })}
        />
      </DiscoverToolkitTestProvider>
    );
    await waitFor(() => {
      expect(onApiAvailable).toHaveBeenCalled();
      expect(Object.keys(onApiAvailable.mock.calls[0][0].children$.getValue())).toHaveLength(3);
    });
    const renderer = onApiAvailable.mock.calls[0][0];
    const onUpdateESQLQuery = jest.fn();
    const currentEsqlVariables: ESQLControlVariable[] = [];
    renderHook(
      () =>
        useESQLVariables({
          isEsqlMode: true,
          controlGroupApi: renderer,
          currentEsqlVariables,
          onUpdateESQLQuery,
        }),
      {
        wrapper: ({ children }) => (
          <DiscoverToolkitTestProvider toolkit={toolkit}>{children}</DiscoverToolkitTestProvider>
        ),
      }
    );

    act(() => renderer.removePanel('middle'));
    await waitFor(() => {
      const panels = toolkit.getCurrentTab().attributes.controlGroupState;
      expect(panels).not.toHaveProperty('middle');
      expect(panels?.first.order).toBe(0);
      expect(panels?.last.order).toBe(2);
    });
    expect(
      selectHasUnsavedChanges(internalState.getState(), { services, runtimeStateManager })
    ).toEqual({ hasUnsavedChanges: true, unsavedTabIds: ['tab-id'] });

    await act(async () => {
      await internalState
        .dispatch(
          internalStateActions.saveDiscoverSession({
            newTitle: 'Controls',
            newDescription: '',
            newTags: [],
            newCopyOnSave: false,
            newTimeRestore: false,
          })
        )
        .unwrap();
    });
    if (useHttpApi) {
      expect(apiClient.upsert).toHaveBeenCalledWith(
        'session-id',
        expect.objectContaining({
          tabs: [
            expect.objectContaining({
              id: 'tab-id',
              control_panels: savedResponse.data.tabs[0].control_panels,
            }),
          ],
        })
      );
      expect(legacySave).not.toHaveBeenCalled();
    } else {
      expect(legacySave).toHaveBeenCalledTimes(1);
      expect(apiClient.upsert).not.toHaveBeenCalled();
    }

    // A child can publish its unchanged state again. The real renderer then combines it with
    // its existing layout; this must not make a successfully saved session look modified.
    const onInput = jest.fn();
    const subscription = renderer.getInput$().subscribe(onInput);
    onInput.mockClear();
    act(() => childUnsavedChanges.last.next(false));
    await waitFor(() => expect(onInput).toHaveBeenCalled());
    subscription.unsubscribe();
    expect(
      selectHasUnsavedChanges(internalState.getState(), { services, runtimeStateManager })
    ).toEqual({ hasUnsavedChanges: false, unsavedTabIds: [] });
  });
});

const controlConfig = {
  variable_name: 'environment',
  variable_type: 'values',
  control_type: 'STATIC_VALUES',
  available_options: ['production', 'staging'],
  selected_options: ['production'],
  single_select: true,
} satisfies OptionsListESQLControlState;

const childUnsavedChanges: Record<string, BehaviorSubject<boolean>> = {};

// Only the child content is stubbed; layout, deletion, and input publishing use the real renderer.
const testControlFactory: EmbeddablePublicDefinition<OptionsListESQLControlState> = {
  type: ESQL_CONTROL,
  buildEmbeddable: async ({ initialState, finalizeApi, uuid }) => {
    const hasUnsavedChanges$ = new BehaviorSubject(false);
    childUnsavedChanges[uuid] = hasUnsavedChanges$;
    return {
      Component: () => null,
      api: {
        ...finalizeApi({
          serializeState: () => initialState,
          applySerializedState: jest.fn(),
          anyStateChange$: EMPTY,
        }),
        hasUnsavedChanges$,
      },
    };
  },
};
