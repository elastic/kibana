/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { internalStateActions, selectTab, selectTabRuntimeState } from '..';
import type { InternalStateStore } from '../internal_state';
import { internalStateSlice } from '../internal_state';
import { getPersistedTabMock } from '../__mocks__/internal_state.mocks';
import * as tabsActions from './tabs';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { dataViewWithTimefieldMock } from '../../../../../__mocks__/data_view_with_timefield';
import { dataViewWithNoTimefieldMock } from '../../../../../__mocks__/data_view_no_timefield';

const markUnsavedTabs = (internalState: InternalStateStore, tabIds: string[]) =>
  internalState.dispatch(
    internalStateSlice.actions.setUnsavedChanges({
      hasUnsavedChanges: true,
      unsavedTabIds: tabIds,
    })
  );

export const setup = async () => {
  const services = createDiscoverServicesMock();
  const { internalState, runtimeStateManager, initializeTabs, initializeSingleTab, switchToTab } =
    getDiscoverInternalStateMock({
      services,
      persistedDataViews: [dataViewWithTimefieldMock, dataViewWithNoTimefieldMock],
    });
  const persistedTab1 = getPersistedTabMock({
    tabId: 'tab-1',
    dataView: dataViewWithTimefieldMock,
    appStateOverrides: { columns: ['tab-1-column'] },
    services,
  });
  const persistedTab2 = getPersistedTabMock({
    tabId: 'tab-2',
    dataView: dataViewWithNoTimefieldMock,
    appStateOverrides: { columns: ['tab-2-column'] },
    services,
  });
  const persistedTab3 = getPersistedTabMock({
    tabId: 'tab-3',
    dataView: dataViewWithTimefieldMock,
    services,
  });
  const persistedDiscoverSession = createDiscoverSessionMock({
    id: 'test-id',
    tabs: [persistedTab1, persistedTab2, persistedTab3],
  });

  await initializeTabs({ persistedDiscoverSession });
  await initializeSingleTab({ tabId: persistedTab1.id });
  await initializeSingleTab({ tabId: persistedTab2.id });
  await switchToTab({ tabId: persistedTab1.id });

  return {
    internalState,
    runtimeStateManager,
    services,
    persistedTab1,
    persistedTab2,
    persistedTab3,
    persistedDiscoverSession,
  };
};

describe('resetDiscoverSession', () => {
  it('should do nothing when there is no persisted session', async () => {
    const { internalState, initializeTabs } = getDiscoverInternalStateMock();
    const updateTabsSpy = jest.spyOn(tabsActions, 'updateTabs');

    await initializeTabs();

    expect(internalState.getState().persistedDiscoverSession).toBeUndefined();

    await internalState.dispatch(internalStateActions.resetDiscoverSession()).unwrap();

    expect(internalState.getState().persistedDiscoverSession).toBeUndefined();
    expect(updateTabsSpy).not.toHaveBeenCalled();
  });

  it('should reset persisted tabs and mark unsaved tabs for refetch', async () => {
    const {
      internalState,
      runtimeStateManager,
      services,
      persistedTab1,
      persistedTab2,
      persistedTab3,
      persistedDiscoverSession,
    } = await setup();

    jest.mocked(services.data.search.searchSource.create).mockClear();

    const tab1RuntimeState = selectTabRuntimeState(runtimeStateManager, persistedTab1.id);
    const tab1StateContainer = tab1RuntimeState.stateContainer$.getValue()!;
    const tab1SavedSearchSetSpy = jest.spyOn(tab1StateContainer.savedSearchState, 'set');

    const tab2RuntimeState = selectTabRuntimeState(runtimeStateManager, persistedTab2.id);
    const tab2StateContainer = tab2RuntimeState.stateContainer$.getValue()!;
    const tab2SavedSearchSetSpy = jest.spyOn(tab2StateContainer.savedSearchState, 'set');

    const tab3RuntimeState = selectTabRuntimeState(runtimeStateManager, persistedTab3.id);

    expect(tab3RuntimeState.stateContainer$.getValue()).toBeUndefined();

    const resetOnSavedSearchChangeSpy = jest.spyOn(
      internalStateSlice.actions,
      'resetOnSavedSearchChange'
    );

    markUnsavedTabs(internalState, [persistedTab2.id, persistedTab3.id]);

    await internalState.dispatch(internalStateActions.resetDiscoverSession()).unwrap();

    expect(internalState.getState().persistedDiscoverSession).toBe(persistedDiscoverSession);
    expect(internalState.getState().tabs.unsafeCurrentId).toBe(persistedTab1.id);

    expect(services.data.search.searchSource.create).toHaveBeenCalledTimes(2);
    expect(resetOnSavedSearchChangeSpy).toHaveBeenCalledWith({ tabId: persistedTab1.id });
    expect(resetOnSavedSearchChangeSpy).toHaveBeenCalledWith({ tabId: persistedTab2.id });
    expect(resetOnSavedSearchChangeSpy).toHaveBeenCalledWith({ tabId: persistedTab3.id });

    expect(tab1SavedSearchSetSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ columns: persistedTab1.columns })
    );

    expect(tab2SavedSearchSetSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ columns: persistedTab2.columns })
    );

    expect(tab3RuntimeState.stateContainer$.getValue()).toBeUndefined();

    const tab1 = selectTab(internalState.getState(), persistedTab1.id);
    const tab2 = selectTab(internalState.getState(), persistedTab2.id);
    const tab3 = selectTab(internalState.getState(), persistedTab3.id);

    expect(tab1.forceFetchOnSelect).toBe(false);
    expect(tab2.forceFetchOnSelect).toBe(true);
    expect(tab3.forceFetchOnSelect).toBe(true);

    expect(tab1RuntimeState.currentDataView$.getValue()).toBe(dataViewWithTimefieldMock);
    expect(tab2RuntimeState.currentDataView$.getValue()).toBe(dataViewWithNoTimefieldMock);
    expect(tab3RuntimeState.currentDataView$.getValue()).toBeUndefined();
  });

  it('should use provided discover session and next selected tab', async () => {
    const { internalState, persistedTab2, persistedDiscoverSession } = await setup();

    markUnsavedTabs(internalState, [persistedTab2.id]);

    const updatedDiscoverSession = {
      ...persistedDiscoverSession,
      title: 'Updated title',
      tabs: cloneDeep(persistedDiscoverSession.tabs),
    };

    await internalState
      .dispatch(
        internalStateActions.resetDiscoverSession({
          updatedDiscoverSession,
          nextSelectedTabId: persistedTab2.id,
        })
      )
      .unwrap();

    expect(internalState.getState().persistedDiscoverSession).toBe(updatedDiscoverSession);
    expect(internalState.getState().tabs.unsafeCurrentId).toBe(persistedTab2.id);

    const refetchedTab = selectTab(internalState.getState(), persistedTab2.id);
    expect(refetchedTab.forceFetchOnSelect).toBe(false);
  });
});
