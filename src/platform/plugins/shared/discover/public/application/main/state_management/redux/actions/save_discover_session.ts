/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import type {
  SaveDiscoverSessionOptions,
  SaveDiscoverSessionParams,
} from '@kbn/saved-search-plugin/public';
import { updateFilterReferences } from '@kbn/es-query';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { cloneDeep, isObject } from 'lodash';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { selectAllTabs, selectRecentlyClosedTabs, selectTab } from '../selectors';
import { createInternalStateAsyncThunk } from '../utils';
import { selectTabRuntimeState } from '../runtime_state';
import { internalStateSlice } from '../internal_state';
import {
  fromSavedObjectTabToSavedSearch,
  fromSavedObjectTabToTabState,
  fromSavedSearchToSavedObjectTab,
  fromTabStateToSavedObjectTab,
} from '../tab_mapping_utils';
import { appendAdHocDataViews, replaceAdHocDataViewWithId, setDataView } from './data_views';
import { setTabs } from './tabs';

type AdHocDataViewAction = 'copy' | 'replace';

export interface SaveDiscoverSessionThunkParams {
  newTitle: string;
  newTimeRestore: boolean;
  newCopyOnSave: boolean;
  newDescription: string;
  newTags: string[];
  isTitleDuplicateConfirmed: boolean;
  onTitleDuplicate: () => void;
}

export const saveDiscoverSession = createInternalStateAsyncThunk(
  'internalState/saveDiscoverSession',
  async (
    {
      newTitle,
      newCopyOnSave,
      newTimeRestore,
      newDescription,
      newTags,
      isTitleDuplicateConfirmed,
      onTitleDuplicate,
    }: SaveDiscoverSessionThunkParams,
    { dispatch, getState, extra: { services, runtimeStateManager } }
  ) => {
    const state = getState();
    const currentTabs = selectAllTabs(state);
    const adHocDataViews = new Map<
      string,
      {
        dataViewSpec: DataViewSpec;
        action: AdHocDataViewAction;
        tabs: DiscoverSessionTab[];
      }
    >();

    const updatedTabs: DiscoverSessionTab[] = await Promise.all(
      currentTabs.map(async (tab) => {
        const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tab.id);
        const tabStateContainer = tabRuntimeState.stateContainer$.getValue();
        const overriddenVisContextAfterInvalidation = tab.overriddenVisContextAfterInvalidation;

        let updatedTab: DiscoverSessionTab;

        if (tabStateContainer) {
          updatedTab = cloneDeep({
            ...fromSavedSearchToSavedObjectTab({
              tab,
              savedSearch: tabStateContainer.savedSearchState.getState(),
              services,
            }),
            timeRestore: newTimeRestore,
            timeRange: newTimeRestore ? tab.globalState.timeRange : undefined,
            refreshInterval: newTimeRestore ? tab.globalState.refreshInterval : undefined,
          });
        } else {
          updatedTab = cloneDeep(
            fromTabStateToSavedObjectTab({
              tab,
              timeRestore: newTimeRestore,
              services,
            })
          );
        }

        if (overriddenVisContextAfterInvalidation) {
          updatedTab.visContext = overriddenVisContextAfterInvalidation;
        }

        const dataViewSpec = updatedTab.serializedSearchSource.index;

        // If the data view is a non-ES|QL ad hoc data view, it may need to be cloned
        if (isObject(dataViewSpec) && dataViewSpec.id && dataViewSpec.type !== ESQL_TYPE) {
          let action: AdHocDataViewAction | undefined;

          if (state.defaultProfileAdHocDataViewIds.includes(dataViewSpec.id)) {
            // If the Discover session is using a default profile ad hoc data view,
            // we copy it with a new ID to avoid conflicts with the profile defaults
            action = 'copy';
          } else if (newCopyOnSave) {
            // Otherwise, if we're copying a session with a custom ad hoc data view,
            // we replace it with a cloned one to avoid ID conflicts across sessions
            action = 'replace';
          }

          if (action) {
            const adHocEntry = adHocDataViews.get(dataViewSpec.id) ?? {
              dataViewSpec,
              action,
              tabs: [],
            };

            adHocEntry.tabs.push(updatedTab);
            adHocDataViews.set(dataViewSpec.id, adHocEntry);
          }
        }

        return updatedTab;
      })
    );

    for (const adHocEntry of adHocDataViews.values()) {
      const { dataViewSpec, action, tabs } = adHocEntry;

      if (!dataViewSpec.id) {
        continue;
      }

      let newDataViewSpec: DataViewSpec & Required<Pick<DataViewSpec, 'id'>>;

      if (action === 'copy') {
        newDataViewSpec = {
          ...dataViewSpec,
          id: uuidv4(),
          name: i18n.translate('discover.savedSearch.defaultProfileDataViewCopyName', {
            defaultMessage: '{dataViewName} ({discoverSessionTitle})',
            values: {
              dataViewName: dataViewSpec.name ?? dataViewSpec.title,
              discoverSessionTitle: newTitle,
            },
          }),
        };

        const dataView = await services.dataViews.create(newDataViewSpec);

        // Make sure our state is aware of the copy so it appears in the UI
        dispatch(appendAdHocDataViews(dataView));
      } else {
        newDataViewSpec = {
          ...dataViewSpec,
          id: uuidv4(),
        };

        // Clear out the old data view since it's no longer needed
        services.dataViews.clearInstanceCache(dataViewSpec.id);

        const dataView = await services.dataViews.create(newDataViewSpec);

        // Make sure our state is aware of the new data view
        dispatch(replaceAdHocDataViewWithId(dataViewSpec.id, dataView));
      }

      // Update all applicable tabs to use the new data view spec
      for (const tab of tabs) {
        tab.serializedSearchSource.index = newDataViewSpec;

        // We also need to update the filter references
        if (Array.isArray(tab.serializedSearchSource.filter)) {
          tab.serializedSearchSource.filter = updateFilterReferences(
            tab.serializedSearchSource.filter,
            dataViewSpec.id,
            newDataViewSpec.id
          );
        }
      }
    }

    const saveParams: SaveDiscoverSessionParams = {
      id: state.persistedDiscoverSession?.id,
      title: newTitle,
      description: newDescription,
      tabs: updatedTabs,
      tags: services.savedObjectsTagging ? newTags : state.persistedDiscoverSession?.tags,
    };

    const saveOptions: SaveDiscoverSessionOptions = {
      onTitleDuplicate,
      copyOnSave: newCopyOnSave,
      isTitleDuplicateConfirmed,
    };

    const discoverSession = await services.savedSearch.saveDiscoverSession(saveParams, saveOptions);

    if (discoverSession) {
      await Promise.all(
        updatedTabs.map(async (tab) => {
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

    return { discoverSession };
  }
);
