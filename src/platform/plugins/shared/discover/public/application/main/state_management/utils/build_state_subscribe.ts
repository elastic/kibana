/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import {
  internalStateActions,
  type InternalStateStore,
  type RuntimeStateManager,
  selectTabRuntimeState,
  type TabState,
} from '../redux';
import type { DiscoverServices } from '../../../../build_services';
import type { DiscoverDataStateContainer } from '../discover_data_state_container';
import { isEqualState, isEqualFilters } from './state_comparators';
import { addLog } from '../../../../utils/add_log';
import { FetchStatus } from '../../../types';
import { loadAndResolveDataView } from './resolve_data_view';
import {
  createDataViewDataSource,
  DataSourceType,
  isDataSourceType,
} from '../../../../../common/data_sources';
import { sendLoadingMsg } from '../../hooks/use_saved_search_messages';

/**
 * Builds a subscribe function for the app and global state, that is executed when the state changes in URL
 * or programmatically. It's main purpose is to detect which changes should trigger a refetch of the data.
 * @param stateContainer
 */
export const buildStateSubscribe =
  ({
    dataState,
    internalState,
    runtimeStateManager,
    services,
    getCurrentTab,
  }: {
    dataState: DiscoverDataStateContainer;
    internalState: InternalStateStore;
    runtimeStateManager: RuntimeStateManager;
    services: DiscoverServices;
    getCurrentTab: () => TabState;
  }) =>
  async (nextState: Pick<TabState, 'appState' | 'globalState'>) => {
    const triggerFetch = () => {
      // Set documents loading to true immediately on state changes since there's a delay
      // on the fetch and we don't want to see state changes reflected in the data grid
      // until the fetch is complete (it also helps to minimize data grid re-renders)
      sendLoadingMsg(dataState.data$.documents$, dataState.data$.documents$.getValue());

      dataState.fetch();
    };

    const prevGlobalState = getCurrentTab().previousGlobalState;
    const nextGlobalState = nextState.globalState;

    if (!isEqualState(nextGlobalState, prevGlobalState)) {
      const logData = {
        globalStateChanged: logEntry(true, prevGlobalState, nextGlobalState),
      };

      addLog(
        '[buildStateSubscribe] global state changes triggers data fetching',
        JSON.stringify(logData, null, 2)
      );

      triggerFetch();
      return;
    }

    const prevAppState = getCurrentTab().previousAppState;
    const nextAppState = nextState.appState;
    const isEsqlMode = isDataSourceType(nextAppState.dataSource, DataSourceType.Esql);
    const queryChanged = !isEqual(nextAppState.query, prevAppState.query);

    if (isEsqlMode && prevAppState.viewMode !== nextAppState.viewMode && !queryChanged) {
      addLog('[appstate] subscribe $fetch ignored for es|ql', { prevAppState, nextAppState });
      return;
    }

    if (isEsqlMode && isEqualState(prevAppState, nextAppState, ['dataSource']) && !queryChanged) {
      // When there's a switch from data view to es|ql, this just leads to a cleanup of index
      // And there's no subsequent action in this function required
      addLog('[appstate] subscribe update ignored for es|ql', { prevAppState, nextAppState });
      return;
    }

    if (isEqualState(prevAppState, nextAppState) && !queryChanged) {
      addLog('[appstate] subscribe update ignored due to no changes', {
        prevAppState,
        nextAppState,
      });
      return;
    }

    addLog('[appstate] subscribe triggered', nextAppState);

    if (isEsqlMode) {
      const isEsqlModePrev = isDataSourceType(prevAppState.dataSource, DataSourceType.Esql);
      if (!isEsqlModePrev) {
        dataState.reset();
      }
    }

    const { sampleSize, sort, dataSource } = prevAppState;
    // Cast to boolean to avoid false positives when comparing
    // undefined and false, which would trigger a refetch
    const sampleSizeChanged = nextAppState.sampleSize !== sampleSize;
    const docTableSortChanged = !isEqual(nextAppState.sort, sort) && !isEsqlMode;
    const dataSourceChanged = !isEqual(nextAppState.dataSource, dataSource) && !isEsqlMode;
    const appFiltersChanged =
      !isEqualFilters(nextAppState.filters, prevAppState.filters) && !isEsqlMode;

    // NOTE: this is also called when navigating from discover app to context app
    if (nextAppState.dataSource && dataSourceChanged) {
      const dataViewId = isDataSourceType(nextAppState.dataSource, DataSourceType.DataView)
        ? nextAppState.dataSource.dataViewId
        : undefined;

      const { dataView: nextDataView, fallback } = await loadAndResolveDataView({
        dataViewId,
        currentDataView: selectTabRuntimeState(
          runtimeStateManager,
          getCurrentTab().id
        )?.currentDataView$.getValue(),
        isEsqlMode,
        internalState,
        runtimeStateManager,
        services,
      });

      // If the requested data view is not found, don't try to load it,
      // and instead reset the app state to the fallback data view
      if (fallback) {
        await internalState.dispatch(
          internalStateActions.updateAppStateAndReplaceUrl({
            tabId: getCurrentTab().id,
            appState: {
              dataSource: nextDataView.id
                ? createDataViewDataSource({ dataViewId: nextDataView.id })
                : undefined,
            },
          })
        );

        return;
      }

      dataState.reset();
      internalState.dispatch(
        internalStateActions.assignNextDataView({
          tabId: getCurrentTab().id,
          dataView: nextDataView,
        })
      );
    }

    if (dataSourceChanged && dataState.getInitialFetchStatus() === FetchStatus.UNINITIALIZED) {
      // stop execution if given data view has changed, and it's not configured to initially start a search in Discover
      return;
    }

    if (
      sampleSizeChanged ||
      docTableSortChanged ||
      dataSourceChanged ||
      queryChanged ||
      appFiltersChanged
    ) {
      const logData = {
        docTableSortChanged: logEntry(docTableSortChanged, sort, nextAppState.sort),
        dataSourceChanged: logEntry(dataSourceChanged, dataSource, nextAppState.dataSource),
        queryChanged: logEntry(queryChanged, prevAppState.query, nextAppState.query),
        appFiltersChanged: logEntry(appFiltersChanged, prevAppState.filters, nextAppState.filters),
      };

      if (dataState.disableNextFetchOnStateChange$.getValue()) {
        addLog(
          '[buildStateSubscribe] next fetch skipped on state change',
          JSON.stringify(logData, null, 2)
        );

        dataState.disableNextFetchOnStateChange$.next(false);

        return;
      }

      addLog(
        '[buildStateSubscribe] app state changes triggers data fetching',
        JSON.stringify(logData, null, 2)
      );

      triggerFetch();
    }
  };

const logEntry = <T>(changed: boolean, prevState: T, nextState: T) => ({
  changed,
  prevState,
  nextState,
});
