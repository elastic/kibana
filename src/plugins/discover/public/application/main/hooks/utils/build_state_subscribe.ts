/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { isEqual } from 'lodash';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { DiscoverStateContainer } from '../../services/discover_state';
import { AppState } from '../../services/discover_app_state_container';
import { addLog } from '../../../../utils/add_log';
import { FetchStatus } from '../../../types';

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
    addLog('📦 AppStateContainer.subscribe update', nextState);
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
        stateContainer.appState.replaceUrlState({ index: nextDataView.id });
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
      addLog('📦 AppStateContainer update triggers data fetching');
      stateContainer.dataState.refetch$.next(undefined);
    }

    setState(nextState);
  };
