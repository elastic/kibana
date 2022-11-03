/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback } from 'react';
import uuid from 'uuid/v4';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { FilterManager } from '@kbn/data-plugin/public';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { useConfirmPersistencePrompt } from '../../../hooks/use_confirm_persistence_prompt';
import { DiscoverStateContainer } from '../services/discover_state';
import { useFiltersValidation } from './use_filters_validation';
import { updateFiltersReferences } from '../utils/update_filter_references';

export const useAdHocDataViews = ({
  savedSearch,
  stateContainer,
  setUrlTracking,
  filterManager,
  dataViews,
  toastNotifications,
}: {
  savedSearch: SavedSearch;
  stateContainer: DiscoverStateContainer;
  setUrlTracking: (dataView: DataView) => void;
  dataViews: DataViewsContract;
  filterManager: FilterManager;
  toastNotifications: ToastsStart;
}) => {
  /**
   * Takes care of checking data view id references in filters
   */
  useFiltersValidation({ savedSearch, filterManager, toastNotifications });

  /**
   * When saving a saved search with an ad hoc data view, a new id needs to be generated for the data view
   * This is to prevent duplicate ids messing with our system
   */
  const updateAdHocDataViewId = useCallback(
    async (prevDataView: DataView) => {
      const newDataView = await dataViews.create({ ...prevDataView.toSpec(), id: uuid() });
      dataViews.clearInstanceCache(prevDataView.id);

      updateFiltersReferences(prevDataView, newDataView);

      stateContainer.actions.replaceAdHocDataViewWithId(prevDataView.id!, newDataView);
      await stateContainer.replaceUrlAppState({ index: newDataView.id });

      setUrlTracking(newDataView);
      return newDataView;
    },
    [dataViews, setUrlTracking, stateContainer]
  );

  const { openConfirmSavePrompt, updateSavedSearch } = useConfirmPersistencePrompt(stateContainer);
  const persistDataView = useCallback(async () => {
    const currentDataView = savedSearch.searchSource.getField('index')!;
    if (!currentDataView || currentDataView.isPersisted()) {
      return currentDataView;
    }

    const createdDataView = await openConfirmSavePrompt(currentDataView);
    if (!createdDataView) {
      return currentDataView; // persistance cancelled
    }

    if (savedSearch.id) {
      // update saved search with saved data view
      const currentState = stateContainer.appState.getState();
      await updateSavedSearch({ savedSearch, dataView: createdDataView, state: currentState });
    }

    return createdDataView;
  }, [stateContainer, openConfirmSavePrompt, savedSearch, updateSavedSearch]);

  return { persistDataView, updateAdHocDataViewId };
};
