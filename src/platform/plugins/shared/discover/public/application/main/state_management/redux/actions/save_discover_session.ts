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
import { isObject } from 'lodash';
import { selectAllTabs } from '../selectors';
import { createInternalStateAsyncThunk } from '../utils';
import { selectTabRuntimeState } from '../runtime_state';
import { internalStateSlice } from '../internal_state';
import {
  fromSavedObjectTabToSavedSearch,
  fromSavedSearchToSavedObjectTab,
  fromTabStateToSavedObjectTab,
} from '../tab_mapping_utils';
import { appendAdHocDataViews } from './data_views';

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
    }: {
      newTitle: string;
      newTimeRestore: boolean;
      newCopyOnSave: boolean;
      newDescription: string;
      newTags: string[];
      isTitleDuplicateConfirmed: boolean;
      onTitleDuplicate: () => void;
    },
    { dispatch, getState, extra: { services, runtimeStateManager } }
  ) => {
    const state = getState();
    const allTabs = selectAllTabs(state);
    const adHocDataViews = new Map<
      string,
      {
        dataViewSpec: DataViewSpec;
        tabs: DiscoverSessionTab[];
      }
    >();

    const updatedTabs: DiscoverSessionTab[] = await Promise.all(
      allTabs.map(async (tab) => {
        const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tab.id);
        const tabStateContainer = tabRuntimeState.stateContainer$.getValue();
        const overriddenVisContextAfterInvalidation = tab.overriddenVisContextAfterInvalidation;

        let updatedTab: DiscoverSessionTab;

        if (tabStateContainer) {
          updatedTab = {
            ...fromSavedSearchToSavedObjectTab({
              tab,
              savedSearch: tabStateContainer.savedSearchState.getState(),
              services,
            }),
            timeRestore: newTimeRestore,
            timeRange: newTimeRestore ? tab.globalState.timeRange : undefined,
            refreshInterval: newTimeRestore ? tab.globalState.refreshInterval : undefined,
          };

          if (newCopyOnSave) {
            await tabStateContainer.actions.updateAdHocDataViewId();
          }
        } else {
          updatedTab = fromTabStateToSavedObjectTab({
            tab,
            timeRestore: newTimeRestore,
            services,
          });
        }

        if (overriddenVisContextAfterInvalidation) {
          updatedTab.visContext = overriddenVisContextAfterInvalidation;
        }

        const dataViewSpec = updatedTab.serializedSearchSource.index;

        if (isObject(dataViewSpec) && dataViewSpec.id) {
          const adHocEntry = adHocDataViews.get(dataViewSpec.id) ?? { dataViewSpec, tabs: [] };

          adHocEntry.tabs.push(updatedTab);
          adHocDataViews.set(dataViewSpec.id, adHocEntry);
        }

        return updatedTab;
      })
    );

    for (const adHocEntry of adHocDataViews.values()) {
      const { dataViewSpec, tabs } = adHocEntry;

      if (!dataViewSpec.id) {
        continue;
      }

      if (state.defaultProfileAdHocDataViewIds.includes(dataViewSpec.id)) {
        // If the Discover session is using a default profile ad hoc data view,
        // we copy it with a new ID to avoid conflicts with the profile defaults
        const replacementSpec: DataViewSpec & Required<Pick<DataViewSpec, 'id'>> = {
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

        // Update all applicable tabs to use the new data view spec
        for (const tab of tabs) {
          tab.serializedSearchSource.index = replacementSpec;

          // If the data view was replaced, we need to update the filter references
          if (Array.isArray(tab.serializedSearchSource.filter)) {
            tab.serializedSearchSource.filter = updateFilterReferences(
              tab.serializedSearchSource.filter,
              dataViewSpec.id,
              replacementSpec.id
            );
          }
        }

        // Skip field list fetching since the existing data view already has the fields
        const dataView = await services.dataViews.create(replacementSpec, true);

        // Make sure our state is aware of the copy so it appears in the UI
        dispatch(appendAdHocDataViews(dataView));
      }
    }

    const saveParams: SaveDiscoverSessionParams = {
      id: state.persistedDiscoverSession?.id,
      title: newTitle,
      description: newDescription,
      tabs: updatedTabs,
      tags: services.savedObjectsTagging ? newTags : undefined,
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

          tabStateContainer?.savedSearchState.set(savedSearch);
          tabStateContainer?.appState.resetInitialState();
        })
      );
    }

    return { id: discoverSession?.id };
  }
);
