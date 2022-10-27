/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback } from 'react';
import { type DataView } from '@kbn/data-views-plugin/public';
import {
  UPDATE_FILTER_REFERENCES_ACTION,
  UPDATE_FILTER_REFERENCES_TRIGGER,
} from '@kbn/unified-search-plugin/public';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { useInternalStateSelector } from '../services/discover_internal_state_container';
import { DiscoverServices } from '../../../build_services';
import { useConfirmPersistencePrompt } from '../../../hooks/use_confirm_persistence_prompt';
import { getUiActions, getUrlTracker } from '../../../kibana_services';
import { DiscoverStateContainer } from '../services/discover_state';
import { useFiltersValidation } from './use_filters_validation';

export const useAdHocDataViews = ({
  stateContainer,
  services,
}: {
  stateContainer: DiscoverStateContainer;
  services: DiscoverServices;
}) => {
  const { filterManager, toastNotifications, dataViews } = services;
  const adHocDataViewList = useInternalStateSelector((state) => state.dataViewsAdHoc);
  /**
   * Takes care of checking data view id references in filters
   */
  useFiltersValidation({
    savedSearch: stateContainer.savedSearchState.get(),
    filterManager,
    toastNotifications,
  });

  /**
   * When saving a saved search with an ad hoc data view, a new id needs to be generated for the data view
   * This is to prevent duplicate ids messing with our system
   */
  const updateAdHocDataViewId = useCallback(
    async (dataViewToUpdate: DataView) => {
      const newDataView = await dataViews.create({ ...dataViewToUpdate.toSpec(), id: undefined });

      const savedSearch = stateContainer.savedSearchState.get();

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
      if (newDataView.id) {
        stateContainer.actions.changeDataView(newDataView.id, true);
      }

      const trackingEnabled = Boolean(newDataView.isPersisted() || savedSearch.id);
      getUrlTracker().setTrackingEnabled(trackingEnabled);

      return newDataView;
    },
    [dataViews, stateContainer, adHocDataViewList]
  );

  const { openConfirmSavePrompt, updateSavedSearch } = useConfirmPersistencePrompt(
    updateAdHocDataViewId,
    stateContainer
  );
  const persistDataView = useCallback(async () => {
    const savedSearch = stateContainer.savedSearchState.get();
    const currentDataView = savedSearch.searchSource.getField('index')!;
    if (currentDataView && !currentDataView.isPersisted()) {
      const createdDataView = await openConfirmSavePrompt(currentDataView);
      if (!createdDataView?.id) {
        return;
      }
      savedSearch.searchSource.setField('index', createdDataView);

      // update saved search with saved data view
      if (createdDataView && savedSearch.id) {
        await updateSavedSearch({ savedSearch, dataView: createdDataView });
      }
      await stateContainer.actions.loadDataViewList();
      await stateContainer.actions.changeDataView(createdDataView.id!, true);
      getUrlTracker().setTrackingEnabled(true);
      return createdDataView;
    }
    return currentDataView;
  }, [stateContainer, openConfirmSavePrompt, updateSavedSearch]);

  return { adHocDataViewList, persistDataView, updateAdHocDataViewId };
};
