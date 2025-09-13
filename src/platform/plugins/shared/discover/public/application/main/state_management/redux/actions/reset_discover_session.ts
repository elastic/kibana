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
import { selectRecentlyClosedTabs, selectTab } from '../selectors';
import {
  fromSavedObjectTabToSavedSearch,
  fromSavedObjectTabToTabState,
} from '../tab_mapping_utils';
import { createInternalStateAsyncThunk } from '../utils';
import { setDataView } from './data_views';
import { setTabs } from './tabs';

export const resetDiscoverSession = createInternalStateAsyncThunk(
  'internalState/resetDiscoverSession',
  async (
    { discoverSession }: { discoverSession: DiscoverSession },
    { dispatch, getState, extra: { services, runtimeStateManager } }
  ) => {
    const state = getState();

    await Promise.all(
      discoverSession.tabs.map(async (tab) => {
        dispatch(internalStateSlice.actions.resetOnSavedSearchChange({ tabId: tab.id }));

        const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tab.id);
        const tabStateContainer = tabRuntimeState.stateContainer$.getValue();

        if (!tabStateContainer) {
          return;
        }

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
      })
    );

    const allTabs = discoverSession.tabs.map((tab) =>
      fromSavedObjectTabToTabState({
        tab,
        existingTab: selectTab(state, tab.id),
      })
    );

    dispatch(
      setTabs({
        allTabs,
        selectedTabId: state.tabs.unsafeCurrentId,
        recentlyClosedTabs: selectRecentlyClosedTabs(state),
      })
    );
  }
);
