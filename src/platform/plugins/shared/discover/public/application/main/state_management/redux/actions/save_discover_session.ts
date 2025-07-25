/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { selectAllTabs } from '../selectors';
import { createInternalStateAsyncThunk } from '../utils';
import { selectTabRuntimeState } from '../runtime_state';

export const initializeTabs = createInternalStateAsyncThunk(
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
    { dispatch, getState, extra: { runtimeStateManager } }
  ) => {
    const state = getState();
    const allTabs = selectAllTabs(state);
    const updatedTabs: DiscoverSessionTab[] = allTabs.map((tab) => {
      const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tab.id);
      const tabSavedSearch = tabRuntimeState.stateContainer$
        .getValue()
        ?.savedSearchState.getState();

      return {
        id: tab.id,
        label: tab.label,
        sort: tabSavedSearch?.sort ?? [],
        columns: tabSavedSearch?.columns ?? [],
        grid: tabSavedSearch?.grid ?? {},
        hideChart: tabSavedSearch?.hideChart ?? false,
        isTextBasedQuery: tabSavedSearch?.isTextBasedQuery ?? false,
        usesAdHocDataView: tabSavedSearch?.usesAdHocDataView,
        serializedSearchSource: tabSavedSearch?.searchSource.getSerializedFields() ?? {},
        viewMode: tabSavedSearch?.viewMode,
        hideAggregatedPreview: tabSavedSearch?.hideAggregatedPreview,
        rowHeight: tabSavedSearch?.rowHeight,
        headerRowHeight: tabSavedSearch?.headerRowHeight,
        timeRestore: tabSavedSearch?.timeRestore,
        timeRange: tabSavedSearch?.timeRange,
        refreshInterval: tabSavedSearch?.refreshInterval,
        rowsPerPage: tabSavedSearch?.rowsPerPage,
        sampleSize: tabSavedSearch?.sampleSize,
        breakdownField: tabSavedSearch?.breakdownField,
        density: tabSavedSearch?.density,
        visContext: tabSavedSearch?.visContext,
      };
    });
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
