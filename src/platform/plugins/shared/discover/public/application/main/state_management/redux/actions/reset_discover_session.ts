/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import { internalStateSlice } from '../internal_state';
import { selectTabRuntimeState } from '../runtime_state';
import { selectHasUnsavedChanges, selectRecentlyClosedTabs, selectTab } from '../selectors';
import {
  fromSavedObjectTabToSavedSearch,
  fromSavedObjectTabToTabState,
} from '../tab_mapping_utils';
import { createInternalStateAsyncThunk } from '../utils';
import { setDataView } from './data_views';
import { setTabs } from './tabs';
import { TabInitialFetchState } from '../types';

export const resetDiscoverSession = createInternalStateAsyncThunk(
  'internalState/resetDiscoverSession',
  async (
    {
      discoverSession,
      resetInitialFetchState,
    }: {
      discoverSession: DiscoverSession;
      resetInitialFetchState?: boolean;
    },
    { dispatch, getState, extra: { services, runtimeStateManager } }
  ) => {
    const state = getState();

    const { unsavedTabIds } = resetInitialFetchState
      ? selectHasUnsavedChanges(state, { runtimeStateManager, services })
      : { unsavedTabIds: new Set<string>() };

    const allTabs = await Promise.all(
      discoverSession.tabs.map(async (tab) => {
        dispatch(internalStateSlice.actions.resetOnSavedSearchChange({ tabId: tab.id }));

        const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tab.id);
        const tabStateContainer = tabRuntimeState.stateContainer$.getValue();

        if (tabStateContainer) {
          const savedSearch = await fromSavedObjectTabToSavedSearch({
            tab,
            discoverSession,
            services,
          });
          const dataView = savedSearch.searchSource.getField('index');

          if (dataView) {
            dispatch(setDataView({ tabId: tab.id, dataView }));
          }

          tabStateContainer.savedSearchState.set(savedSearch);
          tabStateContainer.actions.undoSavedSearchChanges();
          tabStateContainer.appState.resetInitialState();
        }

        const tabState = fromSavedObjectTabToTabState({
          tab,
          existingTab: selectTab(state, tab.id),
        });

        if (tab.id !== state.tabs.unsafeCurrentId && unsavedTabIds.has(tab.id)) {
          tabState.initialFetchState = TabInitialFetchState.forceTrigger;
        }

        return tabState;
      })
    );

    const selectedTabId =
      allTabs.find((tab) => tab.id === state.tabs.unsafeCurrentId)?.id ?? allTabs[0]?.id;

    dispatch(
      setTabs({
        allTabs,
        selectedTabId,
        recentlyClosedTabs: selectRecentlyClosedTabs(state),
      })
    );
  }
);
