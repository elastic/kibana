/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useState } from 'react';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  UPDATE_FILTER_REFERENCES_ACTION,
  UPDATE_FILTER_REFERENCES_TRIGGER,
} from '@kbn/unified-search-plugin/public';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { FilterManager } from '@kbn/data-plugin/public';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { ADHOC_DATA_VIEW_RENDER_EVENT } from '../../../constants';
import { getUiActions } from '../../../kibana_services';
import { useConfirmPersistencePrompt } from '../../../hooks/use_confirm_persistence_prompt';
import { GetStateReturn } from '../services/discover_state';
import { useFiltersValidation } from './use_filters_validation';

export const useAdHocDataViews = ({
  dataView,
  savedSearch,
  stateContainer,
  setUrlTracking,
  filterManager,
  dataViews,
  toastNotifications,
  trackUiMetric,
  isTextBasedMode,
}: {
  dataView: DataView;
  savedSearch: SavedSearch;
  stateContainer: GetStateReturn;
  setUrlTracking: (dataView: DataView) => void;
  dataViews: DataViewsContract;
  filterManager: FilterManager;
  toastNotifications: ToastsStart;
  trackUiMetric?: (metricType: string, eventName: string | string[], count?: number) => void;
  isTextBasedMode?: boolean;
}) => {
  const [adHocDataViewList, setAdHocDataViewList] = useState<DataView[]>(
    !dataView.isPersisted() ? [dataView] : []
  );

  useEffect(() => {
    if (!dataView.isPersisted()) {
      setAdHocDataViewList((prev) => {
        const existing = prev.find((prevDataView) => prevDataView.id === dataView.id);
        return existing ? prev : isTextBasedMode ? [dataView] : [...prev, dataView];
      });
      // increase the counter only for dataview mode
      if (!isTextBasedMode) {
        trackUiMetric?.(METRIC_TYPE.COUNT, ADHOC_DATA_VIEW_RENDER_EVENT);
      }
    }
  }, [dataView, isTextBasedMode, trackUiMetric]);

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

      dataViews.clearInstanceCache(dataViewToUpdate.id);
      setAdHocDataViewList((prev) =>
        prev.filter((d) => d.id && dataViewToUpdate.id && d.id !== dataViewToUpdate.id)
      );

      // update filters references
      const uiActions = await getUiActions();
      const trigger = uiActions.getTrigger(UPDATE_FILTER_REFERENCES_TRIGGER);
      const action = uiActions.getAction(UPDATE_FILTER_REFERENCES_ACTION);

      action?.execute({
        trigger,
        fromDataView: dataViewToUpdate.id,
        toDataView: newDataView.id,
        usedDataViews: [],
      } as ActionExecutionContext);

      savedSearch.searchSource.setField('index', newDataView);
      stateContainer.replaceUrlAppState({ index: newDataView.id });
      setUrlTracking(newDataView);
      return newDataView;
    },
    [dataViews, setUrlTracking, stateContainer, savedSearch.searchSource]
  );

  const { openConfirmSavePrompt, updateSavedSearch } =
    useConfirmPersistencePrompt(updateAdHocDataViewId);
  const persistDataView = useCallback(async () => {
    const currentDataView = savedSearch.searchSource.getField('index')!;
    if (currentDataView && !currentDataView.isPersisted()) {
      const createdDataView = await openConfirmSavePrompt(currentDataView);

      // update saved search with saved data view
      if (createdDataView && savedSearch.id) {
        const currentState = stateContainer.appStateContainer.getState();
        await updateSavedSearch({ savedSearch, dataView: createdDataView, state: currentState });
      }
      return createdDataView;
    }
    return currentDataView;
  }, [stateContainer, openConfirmSavePrompt, savedSearch, updateSavedSearch]);

  const onAddAdHocDataViews = useCallback((newDataViews: DataView[]) => {
    setAdHocDataViewList((prev) => {
      const newAdHocDataViews = newDataViews.filter(
        (newDataView) => !prev.find((d) => d.id === newDataView.id)
      );
      return [...prev, ...newAdHocDataViews];
    });
  }, []);

  return {
    adHocDataViewList,
    persistDataView,
    updateAdHocDataViewId,
    onAddAdHocDataViews,
    setAdHocDataViewList,
  };
};
