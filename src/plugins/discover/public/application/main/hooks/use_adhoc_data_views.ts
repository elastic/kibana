/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback } from 'react';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import {
  UPDATE_FILTER_REFERENCES_ACTION,
  UPDATE_FILTER_REFERENCES_TRIGGER,
} from '@kbn/unified-search-plugin/public';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { FilterManager } from '@kbn/data-plugin/public';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { getUiActions } from '../../../kibana_services';
import { useConfirmPersistencePrompt } from '../../../hooks/use_confirm_persistence_prompt';
import { DiscoverStateContainer } from '../services/discover_state';
import { useFiltersValidation } from './use_filters_validation';

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
    async (dataViewToUpdate: DataView) => {
      const adHocDataViewList = stateContainer.internalState.getState().dataViewsAdHoc;
      const newDataView = await dataViews.create({ ...dataViewToUpdate.toSpec(), id: undefined });

      dataViews.clearInstanceCache(dataViewToUpdate.id);
      const nextAdHocDataViewList = adHocDataViewList.filter(
        (d: DataView) => d.id && dataViewToUpdate.id && d.id !== dataViewToUpdate.id
      );
      stateContainer.internalState.transitions.setDataViewsAdHoc(nextAdHocDataViewList);

      const uiActions = await getUiActions();
      const trigger = uiActions.getTrigger(UPDATE_FILTER_REFERENCES_TRIGGER);
      const action = uiActions.getAction(UPDATE_FILTER_REFERENCES_ACTION);

      // execute shouldn't be awaited, this is important for pending history push cancellation
      action?.execute({
        trigger,
        fromDataView: dataViewToUpdate.id,
        toDataView: newDataView.id,
        usedDataViews: [],
      } as ActionExecutionContext);
      stateContainer.actions.setDataView(newDataView);
      await stateContainer.replaceUrlAppState({ index: newDataView.id });
      setUrlTracking(newDataView);
      return newDataView;
    },
    [dataViews, setUrlTracking, stateContainer]
  );

  const { openConfirmSavePrompt, updateSavedSearch } =
    useConfirmPersistencePrompt(updateAdHocDataViewId);
  const persistDataView = useCallback(async () => {
    const currentDataView = savedSearch.searchSource.getField('index')!;
    if (currentDataView && !currentDataView.isPersisted()) {
      const createdDataView = await openConfirmSavePrompt(currentDataView);

      // update saved search with saved data view
      if (createdDataView && savedSearch.id) {
        const currentState = stateContainer.appState.getState();
        await updateSavedSearch({ savedSearch, dataView: createdDataView, state: currentState });
      }
      return createdDataView;
    }
    return currentDataView;
  }, [stateContainer, openConfirmSavePrompt, savedSearch, updateSavedSearch]);

  return { persistDataView, updateAdHocDataViewId };
};
