/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DiscoverStateContainer } from '../../discover_state';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { getDiscoverStateMock } from '../../../../../__mocks__/discover_state.mock';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { internalStateActions } from '..';
import { internalStateSlice } from '../internal_state';
import { fromTabStateToSavedObjectTab } from '../tab_mapping_utils';
import { getTabStateMock } from '../__mocks__/internal_state.mocks';
import { getTabRuntimeStateMock } from '../__mocks__/runtime_state.mocks';
import * as tabsActions from './tabs';
import type { TabState } from '../types';
import { dataViewMock, dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';

interface SetupOptions {
  additionalPersistedTabs?: DiscoverSessionTab[];
  savedSearch?: SavedSearch | false;
}

const servicesMock = createDiscoverServicesMock();

const createPersistedTab = () =>
  fromTabStateToSavedObjectTab({
    tab: getTabStateMock({
      id: 'secondary-tab',
      label: 'Secondary tab',
      initialInternalState: {
        serializedSearchSource: { index: dataViewMock.id },
      },
    }),
    timeRestore: false,
    services: servicesMock,
  });

const ensureRuntimeState = (state: DiscoverStateContainer, tabId: string) => {
  const existingTab = state.runtimeStateManager.tabs.byId[tabId];

  if (existingTab) {
    existingTab.stateContainer$.next(state);
    existingTab.currentDataView$.next(dataViewMockWithTimeField);
    return;
  }

  state.runtimeStateManager.tabs.byId[tabId] = getTabRuntimeStateMock({
    stateContainer$: new BehaviorSubject<DiscoverStateContainer | undefined>(state),
    currentDataView$: new BehaviorSubject<DataView | undefined>(dataViewMockWithTimeField),
  });
};

const markUnsavedTab = (state: DiscoverStateContainer, tabId: string) =>
  state.internalState.dispatch(
    internalStateSlice.actions.setUnsavedChanges({
      hasUnsavedChanges: true,
      unsavedTabIds: [tabId],
    })
  );

const mockUpdateTabs = () => {
  let updateTabsArgs: Parameters<typeof tabsActions.updateTabs>[0] | undefined;
  jest.spyOn(tabsActions, 'updateTabs').mockImplementation((params) => {
    updateTabsArgs = params;
    return async () => undefined;
  });

  return () => updateTabsArgs!;
};

const mockSearchSourceCreation = (services: ReturnType<typeof createDiscoverServicesMock>) => {
  const searchSource = createSearchSourceMock({ index: dataViewMockWithTimeField });
  jest
    .spyOn(services.data.search.searchSource, 'create')
    .mockImplementation(async () => searchSource);

  return searchSource;
};

const setup = ({ additionalPersistedTabs, savedSearch }: SetupOptions = {}) => {
  const state = getDiscoverStateMock({
    additionalPersistedTabs,
    savedSearch,
    services: servicesMock,
  });

  return { services: servicesMock, state };
};

describe('resetDiscoverSession', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should do nothing when there is no persisted session', async () => {
    const { state } = setup({ savedSearch: false });
    const updateTabsSpy = jest.spyOn(tabsActions, 'updateTabs');

    expect(state.internalState.getState().persistedDiscoverSession).toBeUndefined();

    await state.internalState.dispatch(internalStateActions.resetDiscoverSession()).unwrap();

    expect(updateTabsSpy).not.toHaveBeenCalled();
  });

  it('should reset persisted tabs and mark unsaved tabs for refetch', async () => {
    const { services, state } = setup({
      additionalPersistedTabs: [createPersistedTab()],
    });

    const searchSource = mockSearchSourceCreation(services);

    const getUpdateTabsArgs = mockUpdateTabs();

    const resetOnSavedSearchChangeSpy = jest.spyOn(
      internalStateSlice.actions,
      'resetOnSavedSearchChange'
    );
    const savedSearchSetSpy = jest.spyOn(state.savedSearchState, 'set');
    const undoSavedSearchChangesSpy = jest.spyOn(state.actions, 'undoSavedSearchChanges');
    const resetInitialStateSpy = jest.spyOn(state.appState, 'resetInitialState');

    const currentTabId = state.internalState.getState().tabs.unsafeCurrentId;
    const secondaryTabId = state.internalState
      .getState()
      .tabs.allIds.find((id) => id !== currentTabId)!;

    ensureRuntimeState(state, currentTabId);
    ensureRuntimeState(state, secondaryTabId);

    markUnsavedTab(state, secondaryTabId);

    await state.internalState.dispatch(internalStateActions.resetDiscoverSession()).unwrap();

    expect(resetOnSavedSearchChangeSpy).toHaveBeenCalledWith({ tabId: currentTabId });
    expect(resetOnSavedSearchChangeSpy).toHaveBeenCalledWith({ tabId: secondaryTabId });
    expect(services.data.search.searchSource.create).toHaveBeenCalledTimes(2);
    expect(savedSearchSetSpy).toHaveBeenCalledWith(expect.objectContaining({ searchSource }));
    expect(undoSavedSearchChangesSpy).toHaveBeenCalled();
    expect(resetInitialStateSpy).toHaveBeenCalled();

    const { items, selectedItem, updatedDiscoverSession } = getUpdateTabsArgs();
    expect(updatedDiscoverSession).toBeUndefined();

    const currentTab = items.find((tab) => tab.id === currentTabId)! as TabState;
    const secondaryTab = items.find((tab) => tab.id === secondaryTabId)! as TabState;
    expect(currentTab.forceFetchOnSelect).toBe(false);
    expect(secondaryTab.forceFetchOnSelect).toBe(true);
    expect(selectedItem?.id).toBe(currentTabId);

    expect(state.runtimeStateManager.tabs.byId[currentTabId].currentDataView$.getValue()).toBe(
      dataViewMockWithTimeField
    );
    expect(state.runtimeStateManager.tabs.byId[secondaryTabId].currentDataView$.getValue()).toBe(
      dataViewMockWithTimeField
    );
  });

  it('should use provided discover session and next selected tab', async () => {
    const { services, state } = setup({
      additionalPersistedTabs: [createPersistedTab()],
    });

    mockSearchSourceCreation(services);

    const getUpdateTabsArgs = mockUpdateTabs();

    const currentTabId = state.internalState.getState().tabs.unsafeCurrentId;
    const secondaryTabId = state.internalState
      .getState()
      .tabs.allIds.find((id) => id !== currentTabId)!;

    ensureRuntimeState(state, currentTabId);
    ensureRuntimeState(state, secondaryTabId);

    markUnsavedTab(state, secondaryTabId);

    const persistedDiscoverSession = state.internalState.getState().persistedDiscoverSession!;
    const updatedDiscoverSession = {
      ...persistedDiscoverSession,
      title: 'Updated title',
      tabs: cloneDeep(persistedDiscoverSession.tabs),
    };

    await state.internalState
      .dispatch(
        internalStateActions.resetDiscoverSession({
          updatedDiscoverSession,
          nextSelectedTabId: secondaryTabId,
        })
      )
      .unwrap();

    const {
      items,
      selectedItem,
      updatedDiscoverSession: passedDiscoverSession,
    } = getUpdateTabsArgs();

    expect(passedDiscoverSession).toBe(updatedDiscoverSession);
    expect(selectedItem?.id).toBe(secondaryTabId);

    const refetchedTab = items.find((tab) => tab.id === secondaryTabId)! as TabState;
    expect(refetchedTab.forceFetchOnSelect).toBe(false);
  });
});
