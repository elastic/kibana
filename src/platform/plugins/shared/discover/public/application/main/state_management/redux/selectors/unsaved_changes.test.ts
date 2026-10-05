/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DiscoverTabType } from '@kbn/discover-session-constants';
import { cloneDeep } from 'lodash';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { ControlPanelState, ControlPanelsState } from '@kbn/control-group-renderer';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { getPersistedTabMock, getTabStateMock } from '../__mocks__/internal_state.mocks';
import { internalStateActions } from '..';
import { selectHasUnsavedChanges } from './unsaved_changes';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { dataViewWithTimefieldMock } from '../../../../../__mocks__/data_view_with_timefield';
import { createContextAwarenessMocks } from '../../../../../context_awareness/__mocks__/context_awareness';
import { DataSourceCategory } from '../../../../../context_awareness';
import {
  createProfileStateRegistry,
  METRICS_STATE_DEF,
} from '../../../../../../common/context_awareness';

const setup = async () => {
  const services = createDiscoverServicesMock();
  const {
    internalState,
    runtimeStateManager,
    initializeTabs,
    initializeSingleTab,
    getCurrentTab,
    addNewTab,
  } = getDiscoverInternalStateMock({
    services,
    persistedDataViews: [dataViewWithTimefieldMock],
  });
  const persistedTab = getPersistedTabMock({
    tabId: 'persisted-tab',
    dataView: dataViewWithTimefieldMock,
    services,
  });
  const persistedDiscoverSession = createDiscoverSessionMock({
    id: 'test-id',
    tabs: [persistedTab],
  });

  await initializeTabs({ persistedDiscoverSession });
  await initializeSingleTab({ tabId: persistedTab.id });

  return { internalState, runtimeStateManager, services, getCurrentTab, addNewTab };
};

describe('selectHasUnsavedChanges', () => {
  describe('control order', () => {
    const first: ControlPanelState<OptionsListESQLControlState> = {
      order: 0,
      type: ESQL_CONTROL,
      width: 'medium',
      grow: true,
      control_type: 'STATIC_VALUES',
      variable_name: 'environment',
      variable_type: 'values',
      available_options: ['production', 'staging'],
      selected_options: ['production'],
      single_select: true,
    };
    const last = { ...first, order: 2, variable_name: 'region' };
    const persistedControls = { first, last };

    it.each<{
      name: string;
      controls: ControlPanelsState<OptionsListESQLControlState>;
      storedControls?: ControlPanelsState<OptionsListESQLControlState>;
      expected: ReturnType<typeof selectHasUnsavedChanges>;
    }>([
      {
        name: 'ignores gaps in numeric positions',
        controls: { first, last: { ...last, order: 1 } },
        expected: { hasUnsavedChanges: false, unsavedTabIds: [] },
      },
      {
        name: 'ignores object key order when numeric positions are distinct',
        controls: { last, first },
        expected: { hasUnsavedChanges: false, unsavedTabIds: [] },
      },
      {
        name: 'ignores object key order when numeric positions are equal',
        storedControls: { first, last: { ...last, order: 0 } },
        controls: { last: { ...last, order: 0 }, first },
        expected: { hasUnsavedChanges: false, unsavedTabIds: [] },
      },
      {
        name: 'ignores renumbering equal positions while preserving their sequence',
        storedControls: { last: { ...last, order: 0 }, first },
        controls: { last: { ...last, order: 0 }, first: { ...first, order: 1 } },
        expected: { hasUnsavedChanges: false, unsavedTabIds: [] },
      },
      {
        name: 'detects a changed selection when numeric positions are equal',
        storedControls: { first, last: { ...last, order: 0 } },
        controls: {
          last: { ...last, order: 0 },
          first: { ...first, selected_options: ['staging'] },
        },
        expected: { hasUnsavedChanges: true, unsavedTabIds: ['persisted-tab'] },
      },
      {
        name: 'detects a change in visual order',
        controls: { first: { ...first, order: 2 }, last: { ...last, order: 0 } },
        expected: { hasUnsavedChanges: true, unsavedTabIds: ['persisted-tab'] },
      },
      {
        name: 'detects a changed selection',
        controls: { first: { ...first, selected_options: ['staging'] }, last },
        expected: { hasUnsavedChanges: true, unsavedTabIds: ['persisted-tab'] },
      },
      {
        name: 'detects a removed control',
        controls: { first },
        expected: { hasUnsavedChanges: true, unsavedTabIds: ['persisted-tab'] },
      },
      {
        name: 'detects an added control',
        controls: { first, last, added: { ...first, order: 3, variable_name: 'service' } },
        expected: { hasUnsavedChanges: true, unsavedTabIds: ['persisted-tab'] },
      },
      {
        name: 'detects changed layout settings',
        controls: { first: { ...first, grow: false }, last },
        expected: { hasUnsavedChanges: true, unsavedTabIds: ['persisted-tab'] },
      },
    ])('$name', async ({ controls, storedControls = persistedControls, expected }) => {
      const { internalState, runtimeStateManager, services, getCurrentTab } = await setup();
      const tabId = getCurrentTab().id;
      internalState.dispatch(
        internalStateActions.updateAttributes({
          tabId,
          attributes: { controlGroupState: controls },
        })
      );
      const state = {
        ...internalState.getState(),
        persistedDiscoverSession: createDiscoverSessionMock({
          id: 'test-id',
          tabs: [
            {
              ...getPersistedTabMock({ tabId, dataView: dataViewWithTimefieldMock, services }),
              controlGroupJson: JSON.stringify(storedControls),
            },
          ],
        }),
      };
      const before = cloneDeep(state);

      expect(selectHasUnsavedChanges(state, { runtimeStateManager, services })).toStrictEqual(
        expected
      );
      expect(state).toStrictEqual(before);
    });
  });

  it('returns false when there is no persisted discover session', async () => {
    const services = createDiscoverServicesMock();
    const { internalState, runtimeStateManager, initializeTabs, addNewTab } =
      getDiscoverInternalStateMock({
        services,
      });

    await initializeTabs();
    await addNewTab({ tab: getTabStateMock({ id: 'new-tab' }) });

    const result = selectHasUnsavedChanges(internalState.getState(), {
      runtimeStateManager,
      services,
    });

    expect(result).toEqual({ hasUnsavedChanges: false, unsavedTabIds: [] });
  });

  it('does not detect unsaved changes for untouched persisted tabs with empty sort', async () => {
    const services = createDiscoverServicesMock();
    const { internalState, runtimeStateManager, initializeTabs, initializeSingleTab } =
      getDiscoverInternalStateMock({
        services,
        persistedDataViews: [dataViewWithTimefieldMock],
      });

    const persistedTab = {
      ...getPersistedTabMock({
        tabId: 'persisted-tab',
        dataView: dataViewWithTimefieldMock,
        services,
      }),
      sort: [],
    };
    const persistedDiscoverSession = createDiscoverSessionMock({
      id: 'test-id',
      tabs: [persistedTab],
    });

    await initializeTabs({ persistedDiscoverSession });
    await initializeSingleTab({ tabId: persistedTab.id });

    const result = selectHasUnsavedChanges(internalState.getState(), {
      runtimeStateManager,
      services,
    });

    expect(result).toEqual({ hasUnsavedChanges: false, unsavedTabIds: [] });
  });

  it('does not flag the default query as a change when the saved query is missing', async () => {
    const { internalState, runtimeStateManager, services, getCurrentTab } = await setup();
    const persistedTab = getPersistedTabMock({
      tabId: getCurrentTab().id,
      dataView: dataViewWithTimefieldMock,
      services,
      appStateOverrides: { query: undefined },
    });
    const state = {
      ...internalState.getState(),
      persistedDiscoverSession: createDiscoverSessionMock({
        id: 'test-id',
        tabs: [persistedTab],
      }),
    };

    const result = selectHasUnsavedChanges(state, { runtimeStateManager, services });

    expect(result).toEqual({ hasUnsavedChanges: false, unsavedTabIds: [] });
  });

  it('detects unsaved changes when the active saved search diverges from the persisted tab', async () => {
    const { internalState, runtimeStateManager, services, getCurrentTab } = await setup();
    const currentTab = getCurrentTab();

    internalState.dispatch(
      internalStateActions.updateAppState({
        tabId: currentTab.id,
        appState: { columns: [...(currentTab.appState.columns ?? []), 'newColumn'] },
      })
    );

    const result = selectHasUnsavedChanges(internalState.getState(), {
      runtimeStateManager,
      services,
    });

    expect(result.hasUnsavedChanges).toBe(true);
    expect(result.unsavedTabIds).toEqual([currentTab.id]);
  });

  it('marks newly opened tabs as having unsaved changes', async () => {
    const { internalState, runtimeStateManager, services, addNewTab } = await setup();

    await addNewTab({ tab: getTabStateMock({ id: 'new-tab' }) });

    const result = selectHasUnsavedChanges(internalState.getState(), {
      runtimeStateManager,
      services,
    });

    expect(result.hasUnsavedChanges).toBe(true);
    expect(result.unsavedTabIds).toEqual(['new-tab']);
  });

  it('detects unsaved changes for existing tabs and new tabs at the same time', async () => {
    const { internalState, runtimeStateManager, services, getCurrentTab, addNewTab } =
      await setup();
    const currentTab = getCurrentTab();

    internalState.dispatch(
      internalStateActions.updateAppState({
        tabId: currentTab.id,
        appState: { columns: [...(currentTab.appState.columns ?? []), 'newColumn'] },
      })
    );

    await addNewTab({ tab: getTabStateMock({ id: 'new-tab' }) });

    const result = selectHasUnsavedChanges(internalState.getState(), {
      runtimeStateManager,
      services,
    });

    expect(result.hasUnsavedChanges).toBe(true);
    expect(result.unsavedTabIds).toEqual([currentTab.id, 'new-tab']);
  });

  describe('timeRestore behavior', () => {
    const setupTimeRestoreTest = async (timeRestore: boolean) => {
      const services = createDiscoverServicesMock();
      const {
        internalState,
        runtimeStateManager,
        initializeTabs,
        initializeSingleTab,
        getCurrentTab,
      } = getDiscoverInternalStateMock({
        services,
        persistedDataViews: [dataViewWithTimefieldMock],
      });

      const persistedTab = getPersistedTabMock({
        tabId: 'persisted-tab',
        dataView: dataViewWithTimefieldMock,
        globalStateOverrides: {
          timeRange: { from: 'now-15m', to: 'now' },
          refreshInterval: { pause: true, value: 0 },
        },
        attributesOverrides: {
          timeRestore,
        },
        services,
      });

      const persistedDiscoverSession = createDiscoverSessionMock({
        id: 'test-id',
        tabs: [persistedTab],
      });

      await initializeTabs({ persistedDiscoverSession });
      await initializeSingleTab({ tabId: persistedTab.id });

      return { internalState, runtimeStateManager, services, getCurrentTab };
    };

    it('detects unsaved changes when timeRestore is true and timeRange changes', async () => {
      const { internalState, runtimeStateManager, services, getCurrentTab } =
        await setupTimeRestoreTest(true);
      const currentTab = getCurrentTab();

      internalState.dispatch(
        internalStateActions.setGlobalState({
          tabId: currentTab.id,
          globalState: { timeRange: { from: 'now-30m', to: 'now' } },
        })
      );

      const result = selectHasUnsavedChanges(internalState.getState(), {
        runtimeStateManager,
        services,
      });

      expect(result.hasUnsavedChanges).toBe(true);
      expect(result.unsavedTabIds).toEqual([currentTab.id]);
    });

    it('detects unsaved changes when timeRestore is true and refreshInterval changes', async () => {
      const { internalState, runtimeStateManager, services, getCurrentTab } =
        await setupTimeRestoreTest(true);
      const currentTab = getCurrentTab();

      internalState.dispatch(
        internalStateActions.setGlobalState({
          tabId: currentTab.id,
          globalState: { refreshInterval: { pause: false, value: 5000 } },
        })
      );

      const result = selectHasUnsavedChanges(internalState.getState(), {
        runtimeStateManager,
        services,
      });

      expect(result.hasUnsavedChanges).toBe(true);
      expect(result.unsavedTabIds).toEqual([currentTab.id]);
    });

    it('does not detect unsaved changes when timeRestore is false and timeRange changes', async () => {
      const { internalState, runtimeStateManager, services, getCurrentTab } =
        await setupTimeRestoreTest(false);
      const currentTab = getCurrentTab();

      internalState.dispatch(
        internalStateActions.setGlobalState({
          tabId: currentTab.id,
          globalState: { timeRange: { from: 'now-30m', to: 'now' } },
        })
      );

      const result = selectHasUnsavedChanges(internalState.getState(), {
        runtimeStateManager,
        services,
      });

      expect(result.hasUnsavedChanges).toBe(false);
      expect(result.unsavedTabIds).toEqual([]);
    });

    it('does not detect unsaved changes when timeRestore is false and refreshInterval changes', async () => {
      const { internalState, runtimeStateManager, services, getCurrentTab } =
        await setupTimeRestoreTest(false);
      const currentTab = getCurrentTab();

      internalState.dispatch(
        internalStateActions.setGlobalState({
          tabId: currentTab.id,
          globalState: { refreshInterval: { pause: false, value: 5000 } },
        })
      );

      const result = selectHasUnsavedChanges(internalState.getState(), {
        runtimeStateManager,
        services,
      });

      expect(result.hasUnsavedChanges).toBe(false);
      expect(result.unsavedTabIds).toEqual([]);
    });
  });

  describe('tab type', () => {
    const setupMetricsTab = async (persistedDimensions: string[]) => {
      const services = createDiscoverServicesMock();
      services.profileStateRegistry = createProfileStateRegistry();

      const { profilesManagerMock, dataSourceProfileProviderMock } = createContextAwarenessMocks();
      services.profilesManager = profilesManagerMock;
      jest.mocked(dataSourceProfileProviderMock.resolve).mockReturnValue({
        isMatch: true,
        context: {
          category: DataSourceCategory.Metrics,
          tabType: DiscoverTabType.Metrics,
          profileState: METRICS_STATE_DEF,
        },
      });

      const { internalState, runtimeStateManager, initializeTabs, initializeSingleTab } =
        getDiscoverInternalStateMock({
          services,
          persistedDataViews: [dataViewWithTimefieldMock],
        });

      const persistedTab = getPersistedTabMock({
        tabId: 'metrics-tab',
        dataView: dataViewWithTimefieldMock,
        services,
        tabType: DiscoverTabType.Metrics,
        profileState: { metricsState: { dimensions: persistedDimensions } },
      });
      const persistedDiscoverSession = createDiscoverSessionMock({
        id: 'test-id',
        tabs: [persistedTab],
      });

      await initializeTabs({ persistedDiscoverSession });
      await initializeSingleTab({ tabId: persistedTab.id });

      return { internalState, runtimeStateManager, services };
    };

    it('does not flag unsaved changes when the tab type state matches what was persisted', async () => {
      const { internalState, runtimeStateManager, services } = await setupMetricsTab(['host.name']);

      const result = selectHasUnsavedChanges(internalState.getState(), {
        runtimeStateManager,
        services,
      });

      expect(result).toEqual({ hasUnsavedChanges: false, unsavedTabIds: [] });
    });

    it('flags unsaved changes when the live dimensions differ from what was persisted', async () => {
      const { internalState, runtimeStateManager, services } = await setupMetricsTab(['host.name']);
      const tabId = 'metrics-tab';

      internalState.dispatch(
        internalStateActions.setProfileState({
          tabId,
          profileStateDefinition: METRICS_STATE_DEF,
          profileState: {
            ...METRICS_STATE_DEF.defaultState,
            dimensions: ['service.name'],
          },
        })
      );

      const result = selectHasUnsavedChanges(internalState.getState(), {
        runtimeStateManager,
        services,
      });

      expect(result.hasUnsavedChanges).toBe(true);
      expect(result.unsavedTabIds).toEqual([tabId]);
    });

    it('does not flag a phantom change when a persisted tab resolves with only default state', async () => {
      const { internalState, runtimeStateManager, services } = await setupMetricsTab([]);

      expect(
        selectHasUnsavedChanges(internalState.getState(), { runtimeStateManager, services })
      ).toEqual({ hasUnsavedChanges: false, unsavedTabIds: [] });
    });
  });
});
