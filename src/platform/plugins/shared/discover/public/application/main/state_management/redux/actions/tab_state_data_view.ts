/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import {
  MODIFY_COLUMNS_ON_SWITCH,
  SORT_DEFAULT_ORDER_SETTING,
  DEFAULT_COLUMNS_SETTING,
} from '@kbn/discover-utils';
import {
  DataViewSource,
  getRegisteredEsqlDataView,
  isSameDataset,
  type DataSource,
} from '@kbn/data-source';
import {
  internalStateSlice,
  type TabActionPayload,
  type InternalStateThunkActionCreator,
} from '../internal_state';
import {
  type RuntimeStateManager,
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
import { addLog } from '../../../../../utils/add_log';
import { getDataViewAppState } from '../../utils/get_switch_data_view_app_state';
import { isNonEmptyEsqlQuery } from '../../utils/is_non_empty_esql_query';
import { resolveEsqlSource } from '../../../data_fetching/resolve_esql_source';
import { fetchData } from './tab_state';

/**
 * Set the tab's data source. The tab's data view is derived from it: the wrapped data view for
 * `DataViewSource`, the DataView shim registered by `resolveEsqlSource` for `EsqlSource`.
 */
export const setDataSource: InternalStateThunkActionCreator<
  [TabActionPayload<{ dataSource: DataSource }>]
> =
  ({ tabId, dataSource }) =>
  (dispatch, _, { runtimeStateManager }) => {
    const { currentDataView$, currentDataSource$ } = selectTabRuntimeState(
      runtimeStateManager,
      tabId
    );
    const currentSource = currentDataSource$.getValue();

    if (!isSameDataset(currentSource, dataSource)) {
      dispatch(internalStateSlice.actions.setExpandedDoc({ tabId, expandedDoc: undefined }));
    }

    currentDataView$.next(getDataViewOfSource(dataSource));
    if (dataSource !== currentSource) {
      currentDataSource$.next(dataSource);
    }
  };

/**
 * Set a classic (DSL) data view as the tab's data source.
 */
export const setDataView: InternalStateThunkActionCreator<
  [TabActionPayload<{ dataView: DataView }>]
> =
  ({ tabId, dataView }) =>
  (dispatch, _, { runtimeStateManager }) => {
    dispatch(
      setDataSource({ tabId, dataSource: toDataViewSource(runtimeStateManager, tabId, dataView) })
    );
  };

/**
 * Assign the next data source to the tab's runtime state and pause the refresh interval
 */
export const assignNextDataSource: InternalStateThunkActionCreator<
  [TabActionPayload<{ dataSource: DataSource }>]
> = ({ tabId, dataSource }) =>
  function assignNextDataSourceThunkFn(dispatch) {
    dispatch(setDataSource({ tabId, dataSource }));
    dispatch(internalStateActions.pauseAutoRefreshInterval({ tabId, dataSource }));
  };

/**
 * Assign a classic (DSL) data view as the tab's next data source and pause the refresh interval
 */
export const assignNextDataView: InternalStateThunkActionCreator<
  [TabActionPayload<{ dataView: DataView }>]
> = ({ tabId, dataView }) =>
  function assignNextDataViewThunkFn(dispatch, _, { runtimeStateManager }) {
    dispatch(
      assignNextDataSource({
        tabId,
        dataSource: toDataViewSource(runtimeStateManager, tabId, dataView),
      })
    );
  };

const getDataViewOfSource = (dataSource: DataSource): DataView => {
  if (dataSource.kind === 'index-pattern') {
    return dataSource.getDataView();
  }
  const dataView = getRegisteredEsqlDataView(dataSource);
  if (!dataView) {
    throw new Error(`ES|QL source ${dataSource.id} must be registered with resolveEsqlSource`);
  }
  return dataView;
};

/** Reuses the tab's current source when it already wraps this data view. */
const toDataViewSource = (
  runtimeStateManager: RuntimeStateManager,
  tabId: string,
  dataView: DataView
): DataViewSource => {
  const currentSource = selectTabRuntimeState(
    runtimeStateManager,
    tabId
  ).currentDataSource$.getValue();
  return currentSource?.kind === 'index-pattern' && currentSource.getDataView() === dataView
    ? currentSource
    : new DataViewSource(dataView);
};

/**
 * Publish a new ES|QL source for a control-value change, then fetch.
 * The source id includes those values, so the chart id matches a later reload.
 */
export const applyEsqlControlVariables: InternalStateThunkActionCreator<
  [TabActionPayload<{ esqlVariables: ESQLControlVariable[] }>],
  Promise<void>
> = ({ tabId, esqlVariables }) =>
  async function applyEsqlControlVariablesThunkFn(
    dispatch,
    getState,
    { services, runtimeStateManager }
  ) {
    dispatch(internalStateSlice.actions.setEsqlVariables({ tabId, esqlVariables }));

    const query = selectTab(getState(), tabId).appState.query;
    if (isNonEmptyEsqlQuery(query)) {
      const { currentDataSource$ } = selectTabRuntimeState(runtimeStateManager, tabId);
      const previousSource = currentDataSource$.getValue();
      const { esqlSource } = await resolveEsqlSource({
        esql: query.esql,
        services,
        esqlVariables,
        timeRange: services.data.query.timefilter.timefilter.getTime(),
        previousSourceId: previousSource?.kind === 'esql' ? previousSource.id : undefined,
      });
      dispatch(assignNextDataSource({ tabId, dataSource: esqlSource }));
    }

    dispatch(fetchData({ tabId }));
  };

/**
 * Function executed when switching data view in the UI
 */
export const changeDataView: InternalStateThunkActionCreator<
  [TabActionPayload<{ dataViewOrDataViewId: string | DataView }>],
  Promise<void>
> = ({ tabId, dataViewOrDataViewId }) =>
  async function changeDataViewThunkFn(dispatch, getState, { services, runtimeStateManager }) {
    addLog('[ui] changeDataView', { id: dataViewOrDataViewId });

    const { dataViews, uiSettings } = services;
    const { currentDataView$ } = selectTabRuntimeState(runtimeStateManager, tabId);
    const currentDataView = currentDataView$.getValue();

    let nextDataView: DataView | null = null;

    dispatch(internalStateActions.setIsDataViewLoading({ tabId, isDataViewLoading: true }));

    try {
      nextDataView =
        typeof dataViewOrDataViewId === 'string'
          ? await dataViews.get(dataViewOrDataViewId, false)
          : dataViewOrDataViewId;

      // If nextDataView is an ad hoc data view with no fields, refresh its field list.
      // This can happen when default profile data views are created without fields
      // to avoid unnecessary requests on startup.
      if (!nextDataView.isPersisted() && !nextDataView.fields.length) {
        await dataViews.refreshFields(nextDataView);
      }
    } catch (e) {
      // Swallow the error and keep the current data view
    }

    if (nextDataView && currentDataView) {
      // Mark all profile app state default fields to reset if we are switching to a different data view
      dispatch(
        internalStateActions.setProfileAppStateDefaultFieldsToReset({
          tabId,
          fieldsToReset: 'all',
        })
      );

      const currentState = getState();
      const currentAppState = selectTab(currentState, tabId).appState;
      const nextAppState = getDataViewAppState(
        currentDataView,
        nextDataView,
        uiSettings.get(DEFAULT_COLUMNS_SETTING, []),
        currentAppState.columns || [],
        (currentAppState.sort || []) as SortOrder[],
        uiSettings.get(MODIFY_COLUMNS_ON_SWITCH),
        uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
        currentAppState.query
      );

      dispatch(
        internalStateActions.updateAppState({
          tabId,
          appState: nextAppState,
          isSystemTriggered: true,
        })
      );

      dispatch(internalStateActions.setExpandedDoc({ tabId, expandedDoc: undefined }));
    }

    dispatch(internalStateActions.setIsDataViewLoading({ tabId, isDataViewLoading: false }));
  };

/**
 * Triggered when a new data view is created
 */
export const onDataViewCreated: InternalStateThunkActionCreator<
  [TabActionPayload<{ nextDataView: DataView }>],
  Promise<void>
> = ({ tabId, nextDataView }) =>
  async function onDataViewCreatedThunkFn(dispatch) {
    if (!nextDataView.isPersisted()) {
      dispatch(internalStateActions.appendAdHocDataViews(nextDataView));
    } else {
      await dispatch(internalStateActions.loadDataViewList());
    }
    if (nextDataView.id) {
      await dispatch(
        changeDataView({
          tabId,
          dataViewOrDataViewId: nextDataView,
        })
      );
    }
  };

/**
 * Triggered when a new data view is edited
 */
export const onDataViewEdited: InternalStateThunkActionCreator<
  [TabActionPayload<{ editedDataView: DataView }>],
  Promise<void>
> = ({ tabId, editedDataView }) =>
  async function onDataViewEditedThunkFn(dispatch, _, { services }) {
    if (editedDataView.isPersisted()) {
      // Clear the current data view from the cache and create a new instance
      // of it, ensuring we have a new object reference to trigger a re-render
      services.dataViews.clearInstanceCache(editedDataView.id);
      const newDataView = await services.dataViews.create(editedDataView.toSpec(), true);
      dispatch(assignNextDataView({ tabId, dataView: newDataView }));
    } else {
      await dispatch(updateAdHocDataViewId({ tabId, editedDataView }));
    }
    void dispatch(internalStateActions.loadDataViewList());
    addLog('onDataViewEdited triggers data fetching');
    dispatch(fetchData({ tabId }));
  };

/**
 * When editing an ad hoc data view, a new id needs to be generated for the data view
 * This is to prevent duplicate ids messing with our system
 */
export const updateAdHocDataViewId: InternalStateThunkActionCreator<
  [TabActionPayload<{ editedDataView: DataView }>],
  Promise<DataView | undefined>
> = ({ tabId, editedDataView }) =>
  async function updateAdHocDataViewIdThunkFn(
    dispatch,
    getState,
    { runtimeStateManager, services }
  ) {
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

/**
 * Create and select a temporary/adhoc data view by a given spec
 * Used by the Data View Picker
 */
export const createAndAppendAdHocDataView: InternalStateThunkActionCreator<
  [TabActionPayload<{ dataViewSpec: DataViewSpec }>],
  Promise<DataView>
> = ({ tabId, dataViewSpec }) =>
  async function createAndAppendAdHocDataViewThunkFn(dispatch, _, { services }) {
    const newDataView = await services.dataViews.create(dataViewSpec);
    if (newDataView.fields.getByName('@timestamp')?.type === 'date') {
      newDataView.timeFieldName = '@timestamp';
    }
    dispatch(internalStateActions.appendAdHocDataViews(newDataView));
    await dispatch(
      changeDataView({
        tabId,
        dataViewOrDataViewId: newDataView,
      })
    );
    return newDataView;
  };
