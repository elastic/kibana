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
import { fromTabStateToSavedObjectTab, selectTabRuntimeState } from '..';
import { selectHasUnsavedChanges } from './unsaved_changes';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { dataViewWithTimefieldMock } from '../../../../../__mocks__/data_view_with_timefield';

const setup = async () => {
  const services = createDiscoverServicesMock();
  const { internalState, runtimeStateManager, initializeTabs, initializeSingleTab, addNewTab } =
    getDiscoverInternalStateMock({
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
    timeRestore: false,
    services,
  });
  const persistedDiscoverSession = createDiscoverSessionMock({
    id: 'test-id',
    tabs: [persistedTab],
  });

  await initializeTabs({ persistedDiscoverSession });
  await initializeSingleTab({ tabId: persistedTab.id });

  return { internalState, runtimeStateManager, services, addNewTab };
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
    const { internalState, runtimeStateManager, services } = await setup();
    const currentTabId = internalState.getState().tabs.unsafeCurrentId;
    const currentTabRuntimeState = selectTabRuntimeState(runtimeStateManager, currentTabId);
    const currentTabStateContainer = currentTabRuntimeState.stateContainer$.getValue()!;
    const currentTabSavedSearch = currentTabStateContainer.savedSearchState.getState();

    currentTabStateContainer.savedSearchState.assignNextSavedSearch({
      ...currentTabSavedSearch,
      columns: [...(currentTabSavedSearch.columns ?? []), 'newColumn'],
    });

    const result = selectHasUnsavedChanges(internalState.getState(), {
      runtimeStateManager,
      services,
    });

    expect(result.hasUnsavedChanges).toBe(true);
    expect(result.unsavedTabIds).toEqual([currentTabId]);
  });

  it('marks newly opened tabs as having unsaved changes', async () => {
    const { internalState, runtimeStateManager, services, addNewTab } = await setup();

    await addNewTab({ tab: getTabStateMock({ id: 'new-tab' }) });

    const result = selectHasUnsavedChanges(internalState.getState(), {
      runtimeStateManager,
      services,
    });

    expect(result.hasUnsavedChanges).toBe(true);
    expect(result.unsavedTabIds).toContain('new-tab');
  });

  it('detects unsaved changes for existing tabs and new tabs at the same time', async () => {
    const { internalState, runtimeStateManager, services, addNewTab } = await setup();
    const currentTabId = internalState.getState().tabs.unsafeCurrentId;
    const currentTabRuntimeState = selectTabRuntimeState(runtimeStateManager, currentTabId);
    const currentTabStateContainer = currentTabRuntimeState.stateContainer$.getValue()!;
    const currentTabSavedSearch = currentTabStateContainer.savedSearchState.getState();

    currentTabStateContainer.savedSearchState.assignNextSavedSearch({
      ...currentTabSavedSearch,
      columns: [...(currentTabSavedSearch.columns ?? []), 'newColumn'],
    });

    await addNewTab({ tab: getTabStateMock({ id: 'new-tab' }) });

    const result = selectHasUnsavedChanges(internalState.getState(), {
      runtimeStateManager,
      services,
    });

    expect(result.hasUnsavedChanges).toBe(true);
    expect(result.unsavedTabIds).toEqual([currentTabId, 'new-tab']);
  });
});
