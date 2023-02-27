/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { isEqual } from 'lodash';
import { SavedSearchContainer } from '../../services/discover_saved_search_container';
import { DataStateContainer } from '../../services/discover_data_state_container';
import { DiscoverStateContainer } from '../../services/discover_state';
import {
  AppState,
  DiscoverAppStateContainer,
  isEqualState,
} from '../../services/discover_app_state_container';
import { addLog } from '../../../../utils/add_log';
import { FetchStatus } from '../../../types';

/**
 * Builds a subscribe function for the AppStateContainer, that is executed when the AppState changes in URL
 * or programmatically. It's main purpose is to detect which changes should trigger a refetch of the data.
 * @param stateContainer
 */
export const buildStateSubscribe =
  ({
    appState,
    savedSearchState,
    dataState,
    loadAndResolveDataView,
    setDataView,
  }: {
    appState: DiscoverAppStateContainer;
    savedSearchState: SavedSearchContainer;
    dataState: DataStateContainer;
    loadAndResolveDataView: DiscoverStateContainer['actions']['loadAndResolveDataView'];
    setDataView: DiscoverStateContainer['actions']['setDataView'];
  }) =>
  async (nextState: AppState) => {
    const prevState = appState.getPrevious();
    const savedSearch = savedSearchState.get();
    if (isEqualState(prevState, nextState)) {
      addLog('[appstate] subscribe update ignored due to no changes', { prevState, nextState });
      return;
    }
    addLog('[appstate] subscribe triggered', nextState);
    const { hideChart, interval, breakdownField, sort, index } = appState.getPrevious();
    // Cast to boolean to avoid false positives when comparing
    // undefined and false, which would trigger a refetch
    const chartDisplayChanged = Boolean(nextState.hideChart) !== Boolean(hideChart);
    const chartIntervalChanged = nextState.interval !== interval;
    const breakdownFieldChanged = nextState.breakdownField !== breakdownField;
    const docTableSortChanged = !isEqual(nextState.sort, sort);
    const dataViewChanged = !isEqual(nextState.index, index);
    let savedSearchDataView;
    // NOTE: this is also called when navigating from discover app to context app
    if (nextState.index && dataViewChanged) {
      const { dataView: nextDataView, fallback } = await loadAndResolveDataView(
        nextState.index,
        savedSearch
      );

      // If the requested data view is not found, don't try to load it,
      // and instead reset the app state to the fallback data view
      if (fallback) {
        appState.update({ index: nextDataView.id }, true);
        return;
      }
      savedSearch.searchSource.setField('index', nextDataView);
      dataState.reset();
      setDataView(nextDataView);
      savedSearchDataView = nextDataView;
    }

    savedSearchState.update({ nextDataView: savedSearchDataView, nextState });

    if (dataViewChanged && dataState.initialFetchStatus === FetchStatus.UNINITIALIZED) {
      // stop execution if given data view has changed, and it's not configured to initially start a search in Discover
      return;
    }

    if (
      chartDisplayChanged ||
      chartIntervalChanged ||
      breakdownFieldChanged ||
      docTableSortChanged
    ) {
      addLog('[appstate] subscribe triggers data fetching');
      dataState.fetch();
    }
  };
