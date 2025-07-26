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
import type { SaveDiscoverSessionParams } from '@kbn/saved-search-plugin/public';
import type { SortOrder } from '@kbn/discover-utils';
import { isOfAggregateQueryType, updateFilterReferences } from '@kbn/es-query';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { isObject } from 'lodash';
import { selectAllTabs } from '../selectors';
import { createInternalStateAsyncThunk } from '../utils';
import { selectTabRuntimeState } from '../runtime_state';
import { getAllowedSampleSize } from '../../../../../utils/get_allowed_sample_size';

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
          const tabSavedSearch = tabStateContainer?.savedSearchState.getState();
          const allowedSampleSize = getAllowedSampleSize(
            tabSavedSearch.sampleSize,
            services.uiSettings
          );

          updatedTab = {
            id: tab.id,
            label: tab.label,
            sort: tabSavedSearch.sort ?? [],
            columns: tabSavedSearch.columns ?? [],
            grid: tabSavedSearch.grid ?? {},
            hideChart: tabSavedSearch.hideChart ?? false,
            isTextBasedQuery: tabSavedSearch.isTextBasedQuery ?? false,
            usesAdHocDataView: tabSavedSearch.usesAdHocDataView,
            serializedSearchSource: tabSavedSearch.searchSource.getSerializedFields() ?? {},
            viewMode: tabSavedSearch.viewMode,
            hideAggregatedPreview: tabSavedSearch.hideAggregatedPreview,
            rowHeight: tabSavedSearch.rowHeight,
            headerRowHeight: tabSavedSearch.headerRowHeight,
            timeRestore: newTimeRestore,
            timeRange: newTimeRestore ? tabSavedSearch.timeRange : undefined,
            refreshInterval: newTimeRestore ? tabSavedSearch.refreshInterval : undefined,
            rowsPerPage: tabSavedSearch.rowsPerPage,
            sampleSize:
              tabSavedSearch.sampleSize && tabSavedSearch.sampleSize === allowedSampleSize
                ? tabSavedSearch.sampleSize
                : undefined,
            breakdownField: tabSavedSearch.breakdownField,
            density: tabSavedSearch.density,
            visContext: tabSavedSearch.visContext,
          };

          if (newCopyOnSave) {
            await tabStateContainer.actions.updateAdHocDataViewId();
          }
        } else {
          const allowedSampleSize = getAllowedSampleSize(
            tab.initialAppState?.sampleSize,
            services.uiSettings
          );

          updatedTab = {
            id: tab.id,
            label: tab.label,
            sort: (tab.initialAppState?.sort ?? []) as SortOrder[],
            columns: tab.initialAppState?.columns ?? [],
            grid: tab.initialAppState?.grid ?? {},
            hideChart: tab.initialAppState?.hideChart ?? false,
            isTextBasedQuery: isOfAggregateQueryType(tab.initialAppState?.query),
            // usesAdHocDataView: tab.initialAppState?.usesAdHocDataView,
            // serializedSearchSource: tab.initialAppState?.searchSource.getSerializedFields() ?? {},
            serializedSearchSource: {},
            viewMode: tab.initialAppState?.viewMode,
            hideAggregatedPreview: tab.initialAppState?.hideAggregatedPreview,
            rowHeight: tab.initialAppState?.rowHeight,
            headerRowHeight: tab.initialAppState?.headerRowHeight,
            timeRestore: newTimeRestore,
            timeRange: newTimeRestore ? tab.initialGlobalState?.timeRange : undefined,
            refreshInterval: newTimeRestore ? tab.initialGlobalState?.refreshInterval : undefined,
            rowsPerPage: tab.initialAppState?.rowsPerPage,
            sampleSize:
              tab.initialAppState?.sampleSize &&
              tab.initialAppState.sampleSize === allowedSampleSize
                ? tab.initialAppState.sampleSize
                : undefined,
            breakdownField: tab.initialAppState?.breakdownField,
            density: tab.initialAppState?.density,
            visContext: tab.overriddenVisContextAfterInvalidation,
          };
        }

        if (!newTimeRestore) {
          updatedTab.timeRestore = false;
          updatedTab.timeRange = undefined;
          updatedTab.refreshInterval = undefined;
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
  }
);

// const onSave = async ({
//   newTitle,
//   newCopyOnSave,
//   newTimeRestore,
//   newDescription,
//   newTags,
//   isTitleDuplicateConfirmed,
//   onTitleDuplicate,
// }: {
//   newTitle: string;
//   newTimeRestore: boolean;
//   newCopyOnSave: boolean;
//   newDescription: string;
//   newTags: string[];
//   isTitleDuplicateConfirmed: boolean;
//   onTitleDuplicate: () => void;
// }) => {
//   const appState = state.appState.getState();
//   const currentTitle = savedSearch.title;
//   const currentTimeRestore = savedSearch.timeRestore;
//   const currentRowsPerPage = savedSearch.rowsPerPage;
//   const currentSampleSize = savedSearch.sampleSize;
//   const currentDescription = savedSearch.description;
//   const currentTags = savedSearch.tags;
//   const currentVisContext = savedSearch.visContext;

//   savedSearch.title = newTitle;
//   savedSearch.description = newDescription;
//   savedSearch.timeRestore = newTimeRestore;
//   savedSearch.rowsPerPage = appState.rowsPerPage;

//   // save the custom value or reset it if it's invalid
//   const appStateSampleSize = appState.sampleSize;
//   const allowedSampleSize = getAllowedSampleSize(appStateSampleSize, uiSettings);
//   savedSearch.sampleSize =
//     appStateSampleSize && allowedSampleSize === appStateSampleSize ? appStateSampleSize : undefined;

//   if (savedObjectsTagging) {
//     savedSearch.tags = newTags;
//   }

//   if (overriddenVisContextAfterInvalidation) {
//     savedSearch.visContext = overriddenVisContextAfterInvalidation;
//   }

//   const saveOptions: SaveSavedSearchOptions = {
//     onTitleDuplicate,
//     copyOnSave: newCopyOnSave,
//     isTitleDuplicateConfirmed,
//   };

//   // TODO: put in redux action
//   if (newCopyOnSave) {
//     await state.actions.updateAdHocDataViewId();
//   }

//   const navigateOrReloadSavedSearch = !Boolean(onSaveCb);
//   const response = await saveDataSource({
//     saveOptions,
//     services,
//     savedSearch,
//     state,
//     navigateOrReloadSavedSearch,
//   });

//   // If the save wasn't successful, put the original values back.
//   if (!response) {
//     savedSearch.title = currentTitle;
//     savedSearch.timeRestore = currentTimeRestore;
//     savedSearch.rowsPerPage = currentRowsPerPage;
//     savedSearch.sampleSize = currentSampleSize;
//     savedSearch.description = currentDescription;
//     savedSearch.visContext = currentVisContext;
//     if (savedObjectsTagging) {
//       savedSearch.tags = currentTags;
//     }
//   } else {
//     state.internalState.dispatch(
//       state.injectCurrentTab(internalStateActions.resetOnSavedSearchChange)()
//     );
//     state.appState.resetInitialState();
//   }

//   onSaveCb?.();

//   return response;
// };
