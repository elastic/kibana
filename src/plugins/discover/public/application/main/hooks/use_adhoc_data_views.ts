/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useState } from 'react';
import { DataViewsContract, type DataView } from '@kbn/data-views-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import {
  UPDATE_FILTER_REFERENCES_ACTION,
  UPDATE_FILTER_REFERENCES_TRIGGER,
} from '@kbn/unified-search-plugin/public';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { useConfirmPersistencePrompt } from '../../../hooks/use_confirm_persistence_prompt';
import { getUiActions, getUrlTracker } from '../../../kibana_services';
import { GetStateReturn } from '../services/discover_state';

export const useAdHocDataViews = ({
  dataView,
  savedSearch,
  dataViews,
  stateContainer,
  onChangeDataView,
}: {
  dataView: DataView;
  savedSearch: SavedSearch;
  dataViews: DataViewsContract;
  stateContainer: GetStateReturn;
  onChangeDataView: (dataViewId: string) => Promise<void>;
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

      savedSearch.searchSource.setField('index', newDataView);

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

      return newDataView;
    },
    [dataViews, savedSearch.searchSource]
  );

  const { openConfirmSavePrompt, updateSavedSearch } =
    useConfirmPersistencePrompt(updateAdHocDataViewId);
  const persistDataView = useCallback(async () => {
    const currentDataView = savedSearch.searchSource.getField('index')!;
    if (currentDataView && !currentDataView.isPersisted()) {
      const createdDataView = await openConfirmSavePrompt(currentDataView);
      if (createdDataView) {
        savedSearch.searchSource.setField('index', createdDataView);
        await onChangeDataView(createdDataView.id!);

        // update saved search with saved data view
        if (savedSearch.id) {
          const currentState = stateContainer.appStateContainer.getState();
          await updateSavedSearch({ savedSearch, dataView: createdDataView, state: currentState });
        }
        getUrlTracker().setTrackingEnabled(true);
        return createdDataView;
      }
      return undefined;
    }
    return currentDataView;
  }, [stateContainer, onChangeDataView, openConfirmSavePrompt, savedSearch, updateSavedSearch]);

  return { adHocDataViewList, persistDataView, updateAdHocDataViewId };
};
