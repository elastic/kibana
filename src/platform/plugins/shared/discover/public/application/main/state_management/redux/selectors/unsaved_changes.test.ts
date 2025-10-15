/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { getDiscoverStateMock } from '../../../../../__mocks__/discover_state.mock';
import { getTabStateMock } from '../__mocks__/internal_state.mocks';
import { internalStateActions } from '..';
import { selectHasUnsavedChanges } from './unsaved_changes';

describe('selectHasUnsavedChanges', () => {
  it('returns false when there is no persisted discover session', () => {
    const services = createDiscoverServicesMock();
    const stateContainer = getDiscoverStateMock({ services, savedSearch: false });

    const result = selectHasUnsavedChanges(stateContainer.internalState.getState(), {
      runtimeStateManager: stateContainer.runtimeStateManager,
      services,
    });

    expect(result).toEqual({ hasUnsavedChanges: false, unsavedTabIds: [] });
  });

  it('detects unsaved changes when the active saved search diverges from the persisted tab', () => {
    const services = createDiscoverServicesMock();
    const stateContainer = getDiscoverStateMock({ services });
    const currentTabId = stateContainer.getCurrentTab().id;
    const currentSavedSearch = stateContainer.savedSearchState.getState();

    stateContainer.savedSearchState.assignNextSavedSearch({
      ...currentSavedSearch,
      columns: [...(currentSavedSearch.columns ?? []), 'newColumn'],
    });

    const result = selectHasUnsavedChanges(stateContainer.internalState.getState(), {
      runtimeStateManager: stateContainer.runtimeStateManager,
      services,
    });

    expect(result.hasUnsavedChanges).toBe(true);
    expect(result.unsavedTabIds).toEqual([currentTabId]);
  });

  it('marks newly opened tabs as having unsaved changes', async () => {
    const services = createDiscoverServicesMock();
    const stateContainer = getDiscoverStateMock({ services });
    const existingTab = stateContainer.getCurrentTab();
    const newTab = getTabStateMock({ id: 'new-tab' });

    await stateContainer.internalState.dispatch(
      internalStateActions.updateTabs({
        items: [existingTab, newTab],
        selectedItem: newTab,
      })
    );

    const result = selectHasUnsavedChanges(stateContainer.internalState.getState(), {
      runtimeStateManager: stateContainer.runtimeStateManager,
      services,
    });

    expect(result.hasUnsavedChanges).toBe(true);
    expect(result.unsavedTabIds).toContain('new-tab');
  });
});
