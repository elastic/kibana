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
import { selectTab } from '../selectors';
import {
  fromSavedObjectTabToSavedSearch,
  fromSavedObjectTabToTabState,
} from '../tab_mapping_utils';
import { createInternalStateAsyncThunk } from '../utils';
import { setDataView } from './tab_state_data_view';
import { updateTabs } from './tabs';
import { getInitialAppState } from '../../utils/get_initial_app_state';
import type { DiscoverAppState } from '../types';

export const resetDiscoverSession = createInternalStateAsyncThunk(
  'internalState/resetDiscoverSession',
  async (
    {
      updatedDiscoverSession,
      nextSelectedTabId,
    }:
      | {
          updatedDiscoverSession?: DiscoverSession;
          nextSelectedTabId?: string;
        }
      | undefined = {},
    { dispatch, getState, extra: { services, runtimeStateManager } }
  ) => {
    const state = getState();
    const discoverSession = updatedDiscoverSession ?? state.persistedDiscoverSession;

    if (!discoverSession) {
      return;
    }

    // If an updated session is provided, we know it has just been saved and all tab state is up to date.
    // Otherwise we're resetting the current session, and need to detect changes to mark tabs for refetch.
    const unsavedTabIds = updatedDiscoverSession ? [] : state.tabs.unsavedIds;
    const selectedTabId = nextSelectedTabId ?? state.tabs.unsafeCurrentId;

    const allTabs = await Promise.all(
      discoverSession.tabs.map(async (tab) => {
        dispatch(internalStateSlice.actions.resetOnSavedSearchChange({ tabId: tab.id }));

        const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tab.id);
        const tabStateContainer = tabRuntimeState?.stateContainer$.getValue();
        let initialAppState: DiscoverAppState | undefined;

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

          initialAppState = getInitialAppState({
            initialUrlState: undefined,
            persistedTab: tab,
            dataView,
            services,
          });
        }

        const tabState = fromSavedObjectTabToTabState({
          tab,
          existingTab: selectTab(state, tab.id),
          initialAppState,
        });

        // If the tab had changes, we force-fetch when selecting it so the data matches the UI state.
        // We don't need to do this for the current tab since it's already being synced.
        if (tab.id !== selectedTabId && unsavedTabIds.includes(tab.id)) {
          tabState.forceFetchOnSelect = true;
        }

        return tabState;
      })
    );

    const selectedTab = allTabs.find((tab) => tab.id === selectedTabId) ?? allTabs[0];

    await dispatch(
      updateTabs({ items: allTabs, selectedItem: selectedTab, updatedDiscoverSession })
    );
  }
);
