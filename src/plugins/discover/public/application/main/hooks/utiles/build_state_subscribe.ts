/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { DataView } from '@kbn/data-views-plugin/common';
import { isEqual } from 'lodash';
import { AppState, DiscoverStateContainer } from '../../services/discover_state';
import { DiscoverServices } from '../../../../build_services';
import { addLog } from '../../../../utils/addLog';
import { loadDataView } from '../../utils/resolve_data_view';
import { updateSavedSearch } from '../../utils/persist_saved_search';
import { FetchStatus } from '../../../types';

export const buildStateSubscribe =
  ({
    stateContainer,
    services,
    savedSearch,
    setSavedSearch,
    dataView,
  }: {
    stateContainer: DiscoverStateContainer;
    services: DiscoverServices;
    savedSearch: SavedSearch;
    setSavedSearch: (savedSearch: SavedSearch) => void;
    dataView: DataView;
  }) =>
  async (nextState: AppState) => {
    addLog('📦 AppStateContainer.subscribe update', nextState);
    const { hideChart, interval, sort, index } = stateContainer.getPreviousAppState();
    // chart was hidden, now it should be displayed, so data is needed
    const chartDisplayChanged = nextState.hideChart !== hideChart && hideChart;
    const chartIntervalChanged = nextState.interval !== interval;
    const docTableSortChanged = !isEqual(nextState.sort, sort);
    const dataViewChanged = !isEqual(nextState.index, index);
    // NOTE: this is also called when navigating from discover app to context app
    let nextDataView = dataView;
    if (nextState.index && dataViewChanged) {
      /**
       *  Without resetting the fetch state, e.g. a time column would be displayed when switching
       *  from a data view without to a data view with time filter for a brief moment
       *  That's because appState is updated before savedSearchData$
       *  The following line of code catches this, but should be improved
       */
      nextDataView = (await loadDataView(services.dataViews, services.uiSettings, nextState.index))
        .loaded;
      stateContainer.dataStateContainer.reset();
      savedSearch.searchSource.setField('index', nextDataView);
    }

    updateSavedSearch({ savedSearch, dataView: nextDataView, state: nextState, services });
    stateContainer.savedSearchContainer.set({ ...savedSearch });
    setSavedSearch({ ...savedSearch });
    addLog('AppStateContainer.subscribe update', nextState);

    if (
      dataViewChanged &&
      stateContainer.dataStateContainer.initialFetchStatus === FetchStatus.UNINITIALIZED
    ) {
      return;
    }

    if (chartDisplayChanged || chartIntervalChanged || docTableSortChanged || dataViewChanged) {
      addLog('📦 AppStateContainer update triggers data fetching');
      stateContainer.actions.fetch();
    }
  };
