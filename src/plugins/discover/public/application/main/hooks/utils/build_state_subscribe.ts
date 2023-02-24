/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { isEqual } from 'lodash';
import { DiscoverStateContainer } from '../../services/discover_state';
import { AppState, isEqualState } from '../../services/discover_app_state_container';
import { addLog } from '../../../../utils/add_log';
import { FetchStatus } from '../../../types';

/**
 * Builds a subscribe function for the AppStateContainer, that is executed when the AppState changes in URL
 * or programmatically. It's main purpose is to detect which changes should trigger a refetch of the data.
 * @param stateContainer
 * @param savedSearch
 * @param setState
 */
export const buildStateSubscribe =
  ({
    stateContainer,
    savedSearch,
    setState,
  }: {
    stateContainer: DiscoverStateContainer;
    savedSearch: SavedSearch;
    setState: (state: AppState) => void;
  }) =>
  async (nextState: AppState) => {
    const prevState = stateContainer.appState.getPrevious();
    if (isEqualState(prevState, nextState)) {
      addLog('[appstate] subscribe update ignored due to no changes');
      return;
    }
    addLog('[appstate] subscribe triggered', nextState);
    const { hideChart, interval, breakdownField, sort, index } =
      stateContainer.appState.getPrevious();
    // Cast to boolean to avoid false positives when comparing
    // undefined and false, which would trigger a refetch
    const chartDisplayChanged = Boolean(nextState.hideChart) !== Boolean(hideChart);
    const chartIntervalChanged = nextState.interval !== interval;
    const breakdownFieldChanged = nextState.breakdownField !== breakdownField;
    const docTableSortChanged = !isEqual(nextState.sort, sort);
    const dataViewChanged = !isEqual(nextState.index, index);
    // NOTE: this is also called when navigating from discover app to context app
    if (nextState.index && dataViewChanged) {
      const { dataView: nextDataView, fallback } =
        await stateContainer.actions.loadAndResolveDataView(nextState.index, savedSearch);

      // If the requested data view is not found, don't try to load it,
      // and instead reset the app state to the fallback data view
      if (fallback) {
        stateContainer.appState.update({ index: nextDataView.id }, true);
        return;
      }
      savedSearch.searchSource.setField('index', nextDataView);
      stateContainer.dataState.reset();
      stateContainer.actions.setDataView(nextDataView);
    }

    if (
      dataViewChanged &&
      stateContainer.dataState.initialFetchStatus === FetchStatus.UNINITIALIZED
    ) {
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
      stateContainer.dataState.refetch$.next(undefined);
    }

    setState(nextState);
  };
