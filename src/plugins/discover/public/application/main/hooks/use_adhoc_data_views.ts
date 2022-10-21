/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useState } from 'react';
import { DataViewsContract, type DataView } from '@kbn/data-views-plugin/public';
import {
  UPDATE_FILTER_REFERENCES_ACTION,
  UPDATE_FILTER_REFERENCES_TRIGGER,
} from '@kbn/unified-search-plugin/public';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { FilterManager } from '@kbn/data-plugin/public';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { getUiActions } from '../../../kibana_services';
import { useConfirmPersistencePrompt } from '../../../hooks/use_confirm_persistence_prompt';
import { getUiActions, getUrlTracker } from '../../../kibana_services';
import { DiscoverStateContainer } from '../services/discover_state';
import { useFiltersValidation } from './use_filters_validation';

export const useAdHocDataViews = ({
  dataView,
  dataViews,
  stateContainer, filterManager, toastNotifications,



}: {
  dataView: DataView;
  dataViews: DataViewsContract;
  stateContainer: DiscoverStateContainer;
  filterManager: FilterManager;
  toastNotifications: ToastsStart;
}) => {
  const [adHocDataViewList, setAdHocDataViewList] = useState<DataView[]>(
    !dataView.isPersisted() ? [dataView] : []
  );

  useEffect(() => {
    if (!dataView.isPersisted()) {
      setAdHocDataViewList((prev) => {
        const existing = prev.find((prevDataView) => prevDataView.id === dataView.id);
        return existing ? prev : [...prev, dataView];
      });
    }
  }, [dataView]);

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
      const newDataView = await dataViews.create({ ...dataViewToUpdate.toSpec(), id: undefined });
      const savedSearch = stateContainer.savedSearchState.get();

      dataViews.clearInstanceCache(dataViewToUpdate.id);
      setAdHocDataViewList((prev) =>
        prev.filter((d) => d.id && dataViewToUpdate.id && d.id !== dataViewToUpdate.id)
      );

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

      stateContainer.replaceUrlAppState({ index: newDataView.id });
      getUrlTracker().setUrlTracking(newDataView);
      return newDataView;
    },
    [dataViews, stateContainer]
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
      savedSearch.searchSource.setField('index', createdDataView);

      // update saved search with saved data view
      if (createdDataView && savedSearch.id) {
        await updateSavedSearch({ savedSearch, dataView: createdDataView });
      }
      await stateContainer.actions.loadDataViewList();
      await stateContainer.actions.changeDataView(createdDataView.id!, true);
      getUrlTracker().setTrackingEnabled(true);
      return createdDataView;
        // update saved search with saved data view
        if (savedSearch.id) {
          await updateSavedSearch({ savedSearch, dataView: createdDataView });
        }
        await stateContainer.actions.loadDataViewList();
        await stateContainer.actions.changeDataView(createdDataView.id!, true);
        getUrlTracker().setTrackingEnabled(true);
        return createdDataView;
      }
      return undefined;
    }
    return currentDataView;
  }, [stateContainer, openConfirmSavePrompt, updateSavedSearch]);
  }, [stateContainer, openConfirmSavePrompt, updateSavedSearch]);

  return { adHocDataViewList, persistDataView, updateAdHocDataViewId };
};
