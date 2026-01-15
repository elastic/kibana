/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import {
  internalStateSlice,
  type TabActionPayload,
  type InternalStateThunkActionCreator,
} from '../internal_state';
import {
  selectIsDataViewUsedInMultipleRuntimeTabStates,
  selectTabRuntimeState,
} from '../runtime_state';
import { internalStateActions } from '..';
import { selectTab } from '../selectors';
import { updateFiltersReferences } from '../../utils/update_filter_references';
import {
  createDataViewDataSource,
  DataSourceType,
  isDataSourceType,
} from '../../../../../../common/data_sources';

/**
 * Set the data view in the tab's runtime state
 */
export const setDataView: InternalStateThunkActionCreator<
  [TabActionPayload<{ dataView: DataView }>]
> =
  ({ tabId, dataView }) =>
  (dispatch, _, { runtimeStateManager }) => {
    const { currentDataView$ } = selectTabRuntimeState(runtimeStateManager, tabId);

    if (dataView.id !== currentDataView$.getValue()?.id) {
      dispatch(internalStateSlice.actions.setExpandedDoc({ tabId, expandedDoc: undefined }));
    }

    currentDataView$.next(dataView);
  };

/**
 * Assign the next data view to the tab's runtime state, pause the refresh interval, and update the saved search's search source
 */
export const assignNextDataView: InternalStateThunkActionCreator<
  [TabActionPayload<{ dataView: DataView }>]
> = ({ tabId, dataView }) =>
  async function assignNextDataViewThunkFn(dispatch, _, { runtimeStateManager }) {
    dispatch(setDataView({ tabId, dataView }));
    dispatch(internalStateActions.pauseAutoRefreshInterval({ tabId, dataView }));

    const { stateContainer$ } = selectTabRuntimeState(runtimeStateManager, tabId);
    const savedSearchState = stateContainer$.getValue()?.savedSearchState.getState();
    savedSearchState?.searchSource.setField('index', dataView);
  };

/**
 * When editing an ad hoc data view, a new id needs to be generated for the data view
 * This is to prevent duplicate ids messing with our system
 */
export const updateAdHocDataViewId: InternalStateThunkActionCreator<
  [TabActionPayload<{ editedDataView: DataView }>],
  Promise<DataView | undefined>
> =
  ({ tabId, editedDataView }) =>
  async (dispatch, getState, { runtimeStateManager, services }) => {
    const { currentDataView$ } = selectTabRuntimeState(runtimeStateManager, tabId);
    const prevDataView = currentDataView$.getValue();
    if (!prevDataView || prevDataView.isPersisted()) return;

    const isUsedInMultipleTabs = selectIsDataViewUsedInMultipleRuntimeTabStates(
      runtimeStateManager,
      prevDataView.id!
    );

    const nextDataView = await services.dataViews.create({
      ...editedDataView.toSpec(),
      id: uuidv4(),
    });

    if (!isUsedInMultipleTabs) {
      services.dataViews.clearInstanceCache(prevDataView.id);
    }

    await updateFiltersReferences({
      prevDataView,
      nextDataView,
      services,
    });

    if (isUsedInMultipleTabs) {
      dispatch(internalStateActions.appendAdHocDataViews(nextDataView));
    } else {
      dispatch(internalStateActions.replaceAdHocDataViewWithId(prevDataView.id!, nextDataView));
    }

    const currentState = getState();
    const appState = selectTab(currentState, tabId).appState;

    if (isDataSourceType(appState.dataSource, DataSourceType.DataView)) {
      await dispatch(
        internalStateActions.updateAppStateAndReplaceUrl({
          tabId,
          appState: {
            dataSource: nextDataView.id
              ? createDataViewDataSource({ dataViewId: nextDataView.id })
              : undefined,
          },
        })
      );
    }

    const { persistedDiscoverSession } = getState();
    const trackingEnabled = Boolean(nextDataView.isPersisted() || persistedDiscoverSession?.id);
    services.urlTracker.setTrackingEnabled(trackingEnabled);

    return nextDataView;
  };
