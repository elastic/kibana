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
import { DiscoverServices } from '../../../../build_services';
import { addLog } from '../../../../utils/add_log';
import { loadDataView, resolveDataView } from '../../utils/resolve_data_view';
import { FetchStatus } from '../../../types';

export const buildStateSubscribe =
  ({
    stateContainer,
    services,
    savedSearch,
    setState,
  }: {
    stateContainer: DiscoverStateContainer;
    savedSearch: SavedSearch;
    setState: (state: AppState) => void;
    services: DiscoverServices;
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
      /**
       *  Without resetting the fetch state, e.g. a time column would be displayed when switching
       *  from a data view without to a data view with time filter for a brief moment
       *  That's because appState is updated before savedSearchData$
       *  The following line of code catches this, but should be improved
       */
      const nextDataViewData = await loadDataView(
        services.dataViews,
        services.uiSettings,
        nextState.index
      );
      const nextDataView = resolveDataView(
        nextDataViewData,
        savedSearch.searchSource,
        services.toastNotifications
      );

      // If the requested data view is not found, don't try to load it,
      // and instead reset the app state to the fallback data view
      if (!nextDataViewData.stateValFound) {
        stateContainer.appState.replace({ index: nextDataView.id });
        return;
      }
      savedSearch.searchSource.setField('index', nextDataView);
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
