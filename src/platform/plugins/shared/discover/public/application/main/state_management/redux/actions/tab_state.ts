/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isFunction } from 'lodash';
import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  type AggregateQuery,
  type Query,
  type TimeRange,
  isOfAggregateQueryType,
  isOfQueryType,
} from '@kbn/es-query';
import { getInitialESQLQuery } from '@kbn/esql-utils';
import { GLOBAL_STATE_URL_KEY } from '../../../../../../common/constants';
import { APP_STATE_URL_KEY } from '../../../../../../common';
import { DataSourceType } from '../../../../../../common/data_sources';
import { isEqualState } from '../../utils/state_comparators';
import {
  internalStateSlice,
  type InternalStateThunkActionCreator,
  type TabActionPayload,
} from '../internal_state';
import { selectTab } from '../selectors';
import { selectTabRuntimeState } from '../runtime_state';
import type {
  DiscoverAppState,
  DiscoverInternalState,
  TabState,
  UpdateESQLQueryActionPayload,
} from '../types';
import { addLog } from '../../../../../utils/add_log';

type AppStatePayload = TabActionPayload<Pick<TabState, 'appState'>>;

const mergeAppState = (
  currentState: DiscoverInternalState,
  { tabId, appState }: AppStatePayload
) => {
  const currentAppState = selectTab(currentState, tabId).appState;
  const mergedAppState = { ...currentAppState, ...appState };
  return { mergedAppState, hasStateChanges: !isEqualState(currentAppState, mergedAppState) };
};

/**
 * Partially update the tab app state, merging with existing state and pushing to URL history
 */
export const updateAppState: InternalStateThunkActionCreator<[AppStatePayload]> = (payload) =>
  async function updateAppStateThunkFn(dispatch, getState) {
    const { mergedAppState, hasStateChanges } = mergeAppState(getState(), payload);

    if (hasStateChanges) {
      dispatch(
        internalStateSlice.actions.setAppState({ tabId: payload.tabId, appState: mergedAppState })
      );
    }
  };

/**
 * Partially update the tab app state, merging with existing state and replacing URL history
 */
export const updateAppStateAndReplaceUrl: InternalStateThunkActionCreator<
  [AppStatePayload],
  Promise<void>
> = (payload) =>
  async function updateAppStateAndReplaceUrlThunkFn(dispatch, getState, { urlStateStorage }) {
    const currentState = getState();

    if (currentState.tabs.unsafeCurrentId !== payload.tabId) {
      return dispatch(updateAppState(payload));
    }

    const { mergedAppState } = mergeAppState(currentState, payload);

    await urlStateStorage.set(APP_STATE_URL_KEY, mergedAppState, { replace: true });
  };

type GlobalStatePayload = TabActionPayload<Pick<TabState, 'globalState'>>;

const mergeGlobalState = (
  currentState: DiscoverInternalState,
  { tabId, globalState }: GlobalStatePayload
) => {
  const currentGlobalState = selectTab(currentState, tabId).globalState;
  const mergedGlobalState = { ...currentGlobalState, ...globalState };
  return {
    mergedGlobalState,
    hasStateChanges: !isEqualState(currentGlobalState, mergedGlobalState),
  };
};

/**
 * Partially update the tab global state, merging with existing state and pushing to URL history
 */
export const updateGlobalState: InternalStateThunkActionCreator<[GlobalStatePayload]> = (payload) =>
  async function updateGlobalStateThunkFn(dispatch, getState) {
    const { mergedGlobalState, hasStateChanges } = mergeGlobalState(getState(), payload);

    if (hasStateChanges) {
      dispatch(
        internalStateSlice.actions.setGlobalState({
          tabId: payload.tabId,
          globalState: mergedGlobalState,
        })
      );
    }
  };

/**
 * Partially update the tab global state, merging with existing state and replacing URL history
 */
export const updateGlobalStateAndReplaceUrl: InternalStateThunkActionCreator<
  [GlobalStatePayload],
  Promise<void>
> = (payload) =>
  async function updateGlobalStateAndReplaceUrlThunkFn(dispatch, getState, { urlStateStorage }) {
    const currentState = getState();

    if (currentState.tabs.unsafeCurrentId !== payload.tabId) {
      return dispatch(updateGlobalState(payload));
    }

    const { mergedGlobalState } = mergeGlobalState(currentState, payload);
    const globalUrlState: GlobalQueryStateFromUrl = {
      time: mergedGlobalState.timeRange,
      refreshInterval: mergedGlobalState.refreshInterval,
      filters: mergedGlobalState.filters,
    };

    await urlStateStorage.set(GLOBAL_STATE_URL_KEY, globalUrlState, { replace: true });
  };

/**
 * Push the current tab app state and global state to the URL, replacing URL history
 */
export const pushCurrentTabStateToUrl: InternalStateThunkActionCreator<
  [TabActionPayload],
  Promise<void>
> = ({ tabId }) =>
  async function pushCurrentTabStateToUrlThunkFn(dispatch) {
    await Promise.all([
      dispatch(updateGlobalStateAndReplaceUrl({ tabId, globalState: {} })),
      dispatch(updateAppStateAndReplaceUrl({ tabId, appState: {} })),
    ]);
  };

/**
 * Triggered when transitioning from ESQL to Dataview
 * Clean ups the ES|QL query and moves to the dataview mode
 */
export const transitionFromESQLToDataView: InternalStateThunkActionCreator<
  [TabActionPayload<{ dataViewId: string }>]
> = ({ tabId, dataViewId }) =>
  async function transitionFromESQLToDataViewThunkFn(dispatch) {
    dispatch(
      updateAppState({
        tabId,
        appState: {
          query: {
            language: 'kuery',
            query: '',
          },
          columns: [],
          dataSource: {
            type: DataSourceType.DataView,
            dataViewId,
          },
        },
      })
    );
  };

const clearTimeFieldFromSort = (
  sort: DiscoverAppState['sort'],
  timeFieldName: string | undefined
) => {
  if (!Array.isArray(sort) || !timeFieldName) return sort;

  const filteredSort = sort.filter(([field]) => field !== timeFieldName);

  return filteredSort;
};

/**
 * Triggered when transitioning from ESQL to Dataview
 * Clean ups the ES|QL query and moves to the dataview mode
 */
export const transitionFromDataViewToESQL: InternalStateThunkActionCreator<
  [TabActionPayload<{ dataView: DataView }>]
> = ({ tabId, dataView }) =>
  async function transitionFromDataViewToESQLThunkFn(dispatch, getState) {
    const currentState = getState();
    const appState = selectTab(currentState, tabId).appState;
    const { query, sort } = appState;
    const filterQuery = query && isOfQueryType(query) ? query : undefined;
    const queryString = getInitialESQLQuery(dataView, true, filterQuery);
    const clearedSort = clearTimeFieldFromSort(sort, dataView?.timeFieldName);

    dispatch(
      updateAppState({
        tabId,
        appState: {
          query: { esql: queryString },
          filters: [],
          dataSource: {
            type: DataSourceType.Esql,
          },
          columns: [],
          sort: clearedSort,
        },
      })
    );

    // clears pinned filters
    dispatch(updateGlobalState({ tabId, globalState: { filters: [] } }));
  };

/**
 * Updates the ES|QL query string
 */
export const updateESQLQuery: InternalStateThunkActionCreator<[UpdateESQLQueryActionPayload]> = ({
  tabId,
  queryOrUpdater,
}) =>
  async function updateESQLQueryThunkFn(dispatch, getState) {
    addLog('updateESQLQuery');
    const currentState = getState();
    const appState = selectTab(currentState, tabId).appState;
    const { query: currentQuery } = appState;

    if (!isOfAggregateQueryType(currentQuery)) {
      throw new Error(
        'Cannot update a non-ES|QL query. Make sure this function is only called once in ES|QL mode.'
      );
    }

    const queryUpdater = isFunction(queryOrUpdater) ? queryOrUpdater : () => queryOrUpdater;
    const query = { esql: queryUpdater(currentQuery.esql) };

    dispatch(updateAppState({ tabId, appState: { query } }));
  };

/**
 * Triggered when a user submits a query in the search bar
 */
export const onQuerySubmit: InternalStateThunkActionCreator<
  [
    TabActionPayload<{
      payload: { dateRange: TimeRange; query?: Query | AggregateQuery };
      isUpdate?: boolean;
    }>
  ]
> = ({ tabId, payload, isUpdate }) =>
  async function onQuerySubmitThunkFn(
    dispatch,
    getState,
    { searchSessionManager, runtimeStateManager, services }
  ) {
    const { scopedEbtManager$, stateContainer$ } = selectTabRuntimeState(
      runtimeStateManager,
      tabId
    );

    const trackQueryFields = (query: Query | AggregateQuery | undefined) => {
      const scopedEbtManager = scopedEbtManager$.getValue();
      const { fieldsMetadata } = services;

      scopedEbtManager.trackSubmittingQuery({
        query,
        fieldsMetadata,
      });
    };

    trackQueryFields(payload.query);

    if (isUpdate === false) {
      // remove the search session if the given query is not just updated
      searchSessionManager.removeSearchSessionIdFromURL({ replace: false });
      addLog('onQuerySubmit triggers data fetching');
      stateContainer$.getValue()?.dataState.fetch();
    }
  };
