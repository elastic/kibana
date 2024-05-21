/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import type { DiscoverInternalStateContainer } from '../discover_internal_state_container';
import type { DiscoverServices } from '../../../../build_services';
import type { DiscoverSavedSearchContainer } from '../discover_saved_search_container';
import type { DiscoverDataStateContainer } from '../discover_data_state_container';
import type { DiscoverStateContainer } from '../discover_state';
import {
  DiscoverAppState,
  DiscoverAppStateContainer,
  isEqualState,
} from '../discover_app_state_container';
import { addLog } from '../../../../utils/add_log';
import { FetchStatus } from '../../../types';
import { loadAndResolveDataView } from './resolve_data_view';
import {
  createDataViewDataSource,
  DataSourceType,
  isDataSourceType,
} from '../../../../../common/data_sources';

/**
 * Builds a subscribe function for the AppStateContainer, that is executed when the AppState changes in URL
 * or programmatically. It's main purpose is to detect which changes should trigger a refetch of the data.
 * @param stateContainer
 */
export const buildStateSubscribe =
  ({
    appState,
    dataState,
    internalState,
    savedSearchState,
    services,
    setDataView,
  }: {
    appState: DiscoverAppStateContainer;
    dataState: DiscoverDataStateContainer;
    internalState: DiscoverInternalStateContainer;
    savedSearchState: DiscoverSavedSearchContainer;
    services: DiscoverServices;
    setDataView: DiscoverStateContainer['actions']['setDataView'];
  }) =>
  async (nextState: DiscoverAppState) => {
    const prevState = appState.getPrevious();
    const nextQuery = nextState.query;
    const savedSearch = savedSearchState.getState();
    const prevQuery = savedSearch.searchSource.getField('query');
    const isEsqlMode = isDataSourceType(nextState.dataSource, DataSourceType.Esql);
    const queryChanged = !isEqual(nextQuery, prevQuery) || !isEqual(nextQuery, prevState.query);

    if (
      isEsqlMode &&
      isEqualState(prevState, nextState, ['dataSource', 'viewMode']) &&
      !queryChanged
    ) {
      // When there's a switch from data view to es|ql, this just leads to a cleanup of index and viewMode
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

    const { hideChart, interval, breakdownField, sampleSize, sort, dataSource } = prevState;
    // Cast to boolean to avoid false positives when comparing
    // undefined and false, which would trigger a refetch
    const chartDisplayChanged = Boolean(nextState.hideChart) !== Boolean(hideChart);
    const chartIntervalChanged = nextState.interval !== interval && !isEsqlMode;
    const breakdownFieldChanged = nextState.breakdownField !== breakdownField;
    const sampleSizeChanged = nextState.sampleSize !== sampleSize;
    const docTableSortChanged = !isEqual(nextState.sort, sort) && !isEsqlMode;
    const dataSourceChanged = !isEqual(nextState.dataSource, dataSource) && !isEsqlMode;

    let savedSearchDataView;

    // NOTE: this is also called when navigating from discover app to context app
    if (nextState.dataSource && dataSourceChanged) {
      const dataViewId = isDataSourceType(nextState.dataSource, DataSourceType.DataView)
        ? nextState.dataSource.dataViewId
        : undefined;

      const { dataView: nextDataView, fallback } = await loadAndResolveDataView(
        { id: dataViewId, savedSearch, isEsqlMode },
        { internalStateContainer: internalState, services }
      );

      // If the requested data view is not found, don't try to load it,
      // and instead reset the app state to the fallback data view
      if (fallback) {
        appState.update(
          {
            dataSource: nextDataView.id
              ? createDataViewDataSource({ dataViewId: nextDataView.id })
              : undefined,
          },
          true
        );

        return;
      }

      savedSearch.searchSource.setField('index', nextDataView);
      dataState.reset();
      setDataView(nextDataView);
      savedSearchDataView = nextDataView;
    }

    savedSearchState.update({ nextDataView: savedSearchDataView, nextState });

    if (dataSourceChanged && dataState.getInitialFetchStatus() === FetchStatus.UNINITIALIZED) {
      // stop execution if given data view has changed, and it's not configured to initially start a search in Discover
      return;
    }

    if (
      chartDisplayChanged ||
      chartIntervalChanged ||
      breakdownFieldChanged ||
      sampleSizeChanged ||
      docTableSortChanged ||
      dataSourceChanged ||
      queryChanged
    ) {
      const logData = {
        chartDisplayChanged: logEntry(chartDisplayChanged, hideChart, nextState.hideChart),
        chartIntervalChanged: logEntry(chartIntervalChanged, interval, nextState.interval),
        breakdownFieldChanged: logEntry(
          breakdownFieldChanged,
          breakdownField,
          nextState.breakdownField
        ),
        docTableSortChanged: logEntry(docTableSortChanged, sort, nextState.sort),
        dataSourceChanged: logEntry(dataSourceChanged, dataSource, nextState.dataSource),
        queryChanged: logEntry(queryChanged, prevQuery, nextQuery),
      };

      addLog(
        '[buildStateSubscribe] state changes triggers data fetching',
        JSON.stringify(logData, null, 2)
      );

      dataState.fetch();
    }
  };

const logEntry = <T>(changed: boolean, prevState: T, nextState: T) => ({
  changed,
  prevState,
  nextState,
});
