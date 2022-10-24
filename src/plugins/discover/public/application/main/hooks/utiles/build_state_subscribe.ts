/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { differenceWith, isEqual, toPairs } from 'lodash';
import { SavedSearchContainer } from '../../services/discover_saved_search_container';
import { AppState, DiscoverAppStateContainer } from '../../services/discover_app_state_container';
import { DiscoverServices } from '../../../../build_services';
import { addLog } from '../../../../utils/addLog';
import { loadDataView, resolveDataView } from '../../utils/resolve_data_view';
import { FetchStatus } from '../../../types';
import { DataStateContainer } from '../../services/discover_data_state_container';
import { InternalStateContainer } from '../../services/discover_internal_state_container';

export const buildStateSubscribe =
  ({
    appStateContainer,
    savedSearchContainer,
    dataStateContainer,
    internalStateContainer,
    services,
  }: {
    appStateContainer: DiscoverAppStateContainer;
    savedSearchContainer: SavedSearchContainer;
    dataStateContainer: DataStateContainer;
    internalStateContainer: InternalStateContainer;
    services: DiscoverServices;
  }) =>
  async (nextState: AppState) => {
    const prevState = appStateContainer.getPrevious();
    const savedSearchDiff = differenceWith(toPairs(prevState), toPairs(nextState), isEqual).filter(
      (pair) => {
        return pair[0] !== 'filter' && pair[1] !== undefined;
      }
    );
    if (savedSearchDiff.length === 0) {
      addLog('📦 AppStateContainer.subscribe update ignored');
      return;
    }

    addLog('📦 AppStateContainer.subscribe update', nextState);
    const { hideChart, interval, sort, index } = prevState;
    // chart was hidden, now it should be displayed, so data is needed
    const chartDisplayChanged = nextState.hideChart !== hideChart && hideChart;
    const chartIntervalChanged = nextState.interval !== interval;
    const docTableSortChanged = !isEqual(nextState.sort, sort);
    const dataViewChanged = !isEqual(nextState.index, index);
    // NOTE: this is also called when navigating from discover app to context app
    let nextDataView;
    if (nextState.index && dataViewChanged) {
      /**
       *  Without resetting the fetch state, e.g. a time column would be displayed when switching
       *  from a data view without to a data view with time filter for a brief moment
       *  That's because appState is updated before savedSearchData$
       *  The following line of code catches this, but should be improved
       */
      const nextDataViewObj = await loadDataView(
        internalStateContainer.getState().dataViews,
        services,
        nextState.index
      );

      // If the requested data view is not found, don't try to load it,
      // and instead reset the app state to the fallback data view
      if (!nextDataViewObj.stateValFound) {
        resolveDataView(
          nextDataViewObj,
          savedSearchContainer.get().searchSource,
          services.toastNotifications
        );
        await appStateContainer.replace({ index }, true);
        return;
      }
      nextDataView = nextDataViewObj.loaded;
      dataStateContainer.reset();
      internalStateContainer.transitions.setDataView(nextDataView);
    }
    savedSearchContainer.update(nextDataView, nextState);

    if (dataViewChanged && dataStateContainer.initialFetchStatus === FetchStatus.UNINITIALIZED) {
      return;
    }

    if (chartDisplayChanged || chartIntervalChanged || docTableSortChanged || dataViewChanged) {
      addLog('📦 AppStateContainer update triggers data fetching');
      dataStateContainer.refetch$.next(undefined);
    }
  };
