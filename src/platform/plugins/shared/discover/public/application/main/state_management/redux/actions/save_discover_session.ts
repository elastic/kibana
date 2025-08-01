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
  fromSavedSearchToSavedObjectTab,
  fromTabStateToSavedObjectTab,
} from '../tab_mapping_utils';

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

        const dataView = updatedTab.serializedSearchSource.index;
        const profileDataViewIds = state.defaultProfileAdHocDataViewIds;

        // If the Discover session is using a default profile ad hoc data view,
        // we copy it with a new ID to avoid conflicts with the profile defaults
        if (isObject(dataView) && dataView.id && profileDataViewIds.includes(dataView.id)) {
          const replacementSpec: DataViewSpec & Required<Pick<DataViewSpec, 'id'>> = {
            ...dataView,
            id: uuidv4(),
            name: i18n.translate('discover.savedSearch.defaultProfileDataViewCopyName', {
              defaultMessage: '{dataViewName} ({discoverSessionTitle})',
              values: {
                dataViewName: dataView.name ?? dataView.title,
                discoverSessionTitle: updatedTab.label,
              },
            }),
          };

          updatedTab.serializedSearchSource.index = replacementSpec;

          // If the data view was replaced, we need to update the filter references
          if (Array.isArray(updatedTab.serializedSearchSource.filter)) {
            updatedTab.serializedSearchSource.filter = updateFilterReferences(
              updatedTab.serializedSearchSource.filter,
              dataView.id,
              replacementSpec.id
            );
          }
        }

        return updatedTab;
      })
    );

    const updatedDiscoverSession: SaveDiscoverSessionParams = {
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

    const id = await services.savedSearch.saveDiscoverSession(updatedDiscoverSession, saveOptions);

    if (id) {
      allTabs.forEach((tab) => {
        dispatch(internalStateSlice.actions.resetOnSavedSearchChange({ tabId: tab.id }));

        const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tab.id);
        const tabStateContainer = tabRuntimeState.stateContainer$.getValue();

        tabStateContainer?.appState.resetInitialState();
      });
    }

    return { id };
  }
);
