/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { isEqual } from 'lodash';
import type { DiscoverInternalStateContainer } from '../../services/discover_internal_state_container';
import type { DiscoverServices } from '../../../../build_services';
import type { DiscoverSavedSearchContainer } from '../../services/discover_saved_search_container';
import type { DiscoverDataStateContainer } from '../../services/discover_data_state_container';
import type { DiscoverStateContainer } from '../../services/discover_state';
import {
  DiscoverAppState,
  DiscoverAppStateContainer,
  isEqualState,
} from '../../services/discover_app_state_container';
import { addLog } from '../../../../utils/add_log';
import { isTextBasedQuery } from '../../utils/is_text_based_query';
import { FetchStatus } from '../../../types';
import { loadAndResolveDataView } from '../../utils/resolve_data_view';

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
    const savedSearch = savedSearchState.getState();
    if (isEqualState(prevState, nextState)) {
      addLog('[appstate] subscribe update ignored due to no changes', { prevState, nextState });
      return;
    }
    addLog('[appstate] subscribe triggered', nextState);
    const { hideChart, interval, breakdownField, sampleSize, sort, index } = appState.getPrevious();
    // Cast to boolean to avoid false positives when comparing
    // undefined and false, which would trigger a refetch
    const chartDisplayChanged = Boolean(nextState.hideChart) !== Boolean(hideChart);
    const chartIntervalChanged = nextState.interval !== interval;
    const breakdownFieldChanged = nextState.breakdownField !== breakdownField;
    const sampleSizeChanged = nextState.sampleSize !== sampleSize;
    const docTableSortChanged = !isEqual(nextState.sort, sort);
    const dataViewChanged = !isEqual(nextState.index, index);
    let savedSearchDataView;
    // NOTE: this is also called when navigating from discover app to context app
    if (nextState.index && dataViewChanged) {
      const { dataView: nextDataView, fallback } = await loadAndResolveDataView(
        { id: nextState.index, savedSearch, isTextBasedQuery: isTextBasedQuery(nextState?.query) },
        { internalStateContainer: internalState, services }
      );

      // If the requested data view is not found, don't try to load it,
      // and instead reset the app state to the fallback data view
      if (fallback) {
        appState.update({ index: nextDataView.id }, true);
        return;
      }
      savedSearch.searchSource.setField('index', nextDataView);
      dataState.reset(savedSearch);
      setDataView(nextDataView);
      savedSearchDataView = nextDataView;
    }

    savedSearchState.update({ nextDataView: savedSearchDataView, nextState });

    if (dataViewChanged && dataState.getInitialFetchStatus() === FetchStatus.UNINITIALIZED) {
      // stop execution if given data view has changed, and it's not configured to initially start a search in Discover
      return;
    }

    if (
      chartDisplayChanged ||
      chartIntervalChanged ||
      breakdownFieldChanged ||
      sampleSizeChanged ||
      docTableSortChanged ||
      dataViewChanged
    ) {
      addLog('[appstate] subscribe triggers data fetching');
      dataState.fetch();
    }
  };
