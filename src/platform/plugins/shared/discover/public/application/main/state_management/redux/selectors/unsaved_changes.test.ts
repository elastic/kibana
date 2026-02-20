/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { getTabStateMock } from '../__mocks__/internal_state.mocks';
import { fromTabStateToSavedObjectTab, internalStateActions } from '..';
import { selectHasUnsavedChanges } from './unsaved_changes';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { dataViewWithTimefieldMock } from '../../../../../__mocks__/data_view_with_timefield';

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
  const persistedTab = fromTabStateToSavedObjectTab({
    tab: getTabStateMock({
      id: 'persisted-tab',
      initialInternalState: {
        serializedSearchSource: { index: dataViewWithTimefieldMock.id },
      },
    }),
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

      const persistedTab = fromTabStateToSavedObjectTab({
        tab: getTabStateMock({
          id: 'persisted-tab',
          initialInternalState: {
            serializedSearchSource: { index: dataViewWithTimefieldMock.id },
          },
          globalState: {
            timeRange: { from: 'now-15m', to: 'now' },
            refreshInterval: { pause: true, value: 0 },
          },
          attributes: {
            timeRestore,
          },
        }),
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
});
