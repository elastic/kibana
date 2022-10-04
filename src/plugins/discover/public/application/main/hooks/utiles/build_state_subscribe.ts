/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { isEqual } from 'lodash';
import { AppState } from '../../services/discover_app_state_container';
import { DiscoverStateContainer } from '../../services/discover_state';
import { DiscoverServices } from '../../../../build_services';
import { addLog } from '../../../../utils/addLog';
import { loadDataView, resolveDataView } from '../../utils/resolve_data_view';
import { FetchStatus } from '../../../types';

export const buildStateSubscribe =
  ({
    stateContainer,
    services,
  }: {
    stateContainer: DiscoverStateContainer;
    services: DiscoverServices;
  }) =>
  async (nextState: AppState) => {
    const prevState = stateContainer.appStateContainer.getPrevious();

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
        services.dataViews,
        services.uiSettings,
        nextState.index
      );

      // If the requested data view is not found, don't try to load it,
      // and instead reset the app state to the fallback data view
      if (!nextDataViewObj.stateValFound) {
        resolveDataView(
          nextDataViewObj,
          stateContainer.savedSearchContainer.get().searchSource,
          services.toastNotifications
        );
        stateContainer.setAppState({ index }, true);
        return;
      }
      nextDataView = nextDataViewObj.loaded;
      stateContainer.dataStateContainer.reset();
      stateContainer.internalStateContainer.transitions.setDataView(nextDataView);
    }

    stateContainer.savedSearchContainer.update(nextDataView, nextState);

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
