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
  type TabState,
} from '../redux';
import type { DiscoverServices } from '../../../../build_services';
import type { DiscoverSavedSearchContainer } from '../discover_saved_search_container';
import type { DiscoverDataStateContainer } from '../discover_data_state_container';
import type { DiscoverAppState } from '../redux';
import { isEqualState } from './state_comparators';
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
 * Builds a subscribe function for the app state, that is executed when the app state changes in URL
 * or programmatically. It's main purpose is to detect which changes should trigger a refetch of the data.
 * @param stateContainer
 */
export const buildStateSubscribe =
  ({
    dataState,
    internalState,
    runtimeStateManager,
    savedSearchState,
    services,
    getCurrentTab,
  }: {
    dataState: DiscoverDataStateContainer;
    internalState: InternalStateStore;
    runtimeStateManager: RuntimeStateManager;
    savedSearchState: DiscoverSavedSearchContainer;
    services: DiscoverServices;
    getCurrentTab: () => TabState;
  }) =>
  async (nextState: DiscoverAppState) => {
    const prevState = getCurrentTab().previousAppState;
    const savedSearch = savedSearchState.getState();
    const isEsqlMode = isDataSourceType(nextState.dataSource, DataSourceType.Esql);
    const queryChanged = !isEqual(nextState.query, prevState.query);

    if (isEsqlMode && prevState.viewMode !== nextState.viewMode && !queryChanged) {
      savedSearchState.update({ nextState });
      addLog('[appstate] subscribe $fetch ignored for es|ql', { prevState, nextState });
      return;
    }

    if (isEsqlMode && isEqualState(prevState, nextState, ['dataSource']) && !queryChanged) {
      // When there's a switch from data view to es|ql, this just leads to a cleanup of index
      // And there's no subsequent action in this function required
      addLog('[appstate] subscribe update ignored for es|ql', { prevState, nextState });
      return;
    }

    if (isEqualState(prevState, nextState) && !queryChanged) {
      addLog('[appstate] subscribe update ignored due to no changes', { prevState, nextState });
      return;
    }

    addLog('[appstate] subscribe triggered', nextState);

    if (isEsqlMode) {
      const isEsqlModePrev = isDataSourceType(prevState.dataSource, DataSourceType.Esql);
      if (!isEsqlModePrev) {
        savedSearchState.update({ nextState });
        dataState.reset();
      }
    }

    const { sampleSize, sort, dataSource } = prevState;
    // Cast to boolean to avoid false positives when comparing
    // undefined and false, which would trigger a refetch
    const sampleSizeChanged = nextState.sampleSize !== sampleSize;
    const docTableSortChanged = !isEqual(nextState.sort, sort) && !isEsqlMode;
    const dataSourceChanged = !isEqual(nextState.dataSource, dataSource) && !isEsqlMode;

    let savedSearchDataView;

    // NOTE: this is also called when navigating from discover app to context app
    if (nextState.dataSource && dataSourceChanged) {
      const dataViewId = isDataSourceType(nextState.dataSource, DataSourceType.DataView)
        ? nextState.dataSource.dataViewId
        : undefined;

      const { dataView: nextDataView, fallback } = await loadAndResolveDataView({
        dataViewId,
        savedSearch,
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

      savedSearch.searchSource.setField('index', nextDataView);
      dataState.reset();
      internalState.dispatch(
        internalStateActions.assignNextDataView({
          tabId: getCurrentTab().id,
          dataView: nextDataView,
        })
      );
      savedSearchDataView = nextDataView;
    }

    savedSearchState.update({ nextDataView: savedSearchDataView, nextState });

    if (dataSourceChanged && dataState.getInitialFetchStatus() === FetchStatus.UNINITIALIZED) {
      // stop execution if given data view has changed, and it's not configured to initially start a search in Discover
      return;
    }

    if (sampleSizeChanged || docTableSortChanged || dataSourceChanged || queryChanged) {
      const logData = {
        docTableSortChanged: logEntry(docTableSortChanged, sort, nextState.sort),
        dataSourceChanged: logEntry(dataSourceChanged, dataSource, nextState.dataSource),
        queryChanged: logEntry(queryChanged, prevState.query, nextState.query),
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
        '[buildStateSubscribe] state changes triggers data fetching',
        JSON.stringify(logData, null, 2)
      );

      // Set documents loading to true immediately on state changes since there's a delay
      // on the fetch and we don't want to see state changes reflected in the data grid
      // until the fetch is complete (it also helps to minimize data grid re-renders)
      sendLoadingMsg(dataState.data$.documents$, dataState.data$.documents$.getValue());

      dataState.fetch();
    }
  };

const logEntry = <T>(changed: boolean, prevState: T, nextState: T) => ({
  changed,
  prevState,
  nextState,
});
