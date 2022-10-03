/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReduxLikeStateContainer } from '@kbn/kibana-utils-plugin/common';
import { BehaviorSubject, Subject } from 'rxjs';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { AutoRefreshDoneFn } from '@kbn/data-plugin/public';
import { AppState } from './discover_app_state_container';
import { SavedSearchContainer } from './discover_saved_search_container';
import { DiscoverServices } from '../../../build_services';
import { DiscoverSearchSessionManager } from './discover_search_session';
import { getRawRecordType } from '../utils/get_raw_record_type';
import {
  DataAvailableFieldsMsg,
  DataChartsMessage,
  DataDocumentsMsg,
  DataMainMsg,
  DataRefetch$,
  DataRefetchMsg,
  DataTotalHitsMsg,
  SavedSearchData,
} from '../hooks/use_saved_search';
import { SEARCH_ON_PAGE_LOAD_SETTING } from '../../../../common';
import { FetchStatus } from '../../types';
import { getFetch$ } from '../utils/get_fetch_observable';
import { validateTimeRange } from '../utils/validate_time_range';
import { fetchAll } from '../utils/fetch_all';
import { sendResetMsg } from '../hooks/use_saved_search_messages';

export interface DataStateContainer {
  fetch: () => void;
  data$: SavedSearchData;
  refetch$: DataRefetch$;
  subscribe: () => () => void;
  reset: () => void;
  inspectorAdapters: { requests: RequestAdapter };
  initialFetchStatus: FetchStatus;
}

export function getDataStateContainer({
  services,
  searchSessionManager,
  appStateContainer,
  savedSearchContainer,
}: {
  services: DiscoverServices;
  searchSessionManager: DiscoverSearchSessionManager;
  appStateContainer: ReduxLikeStateContainer<AppState>;
  savedSearchContainer: SavedSearchContainer;
}): DataStateContainer {
  const { data } = services;
  const inspectorAdapters = { requests: new RequestAdapter() };
  const appState = appStateContainer.getState();
  const recordRawType = getRawRecordType(appState.query);
  /**
   * The observable to trigger data fetching in UI
   * By refetch$.next('reset') rows and fieldcounts are reset to allow e.g. editing of runtime fields
   * to be processed correctly
   */
  const refetch$ = new Subject<DataRefetchMsg>();
  const shouldSearchOnPageLoad =
    services.uiSettings.get<boolean>(SEARCH_ON_PAGE_LOAD_SETTING) ||
    savedSearchContainer.savedSearch$.getValue().id !== undefined ||
    !services.timefilter.getRefreshInterval().pause ||
    searchSessionManager.hasSearchSessionIdInURL();
  const initialFetchStatus = shouldSearchOnPageLoad
    ? FetchStatus.LOADING
    : FetchStatus.UNINITIALIZED;

  /**
   * The observables the UI (aka React component) subscribes to get notified about
   * the changes in the data fetching process (high level: fetching started, data was received)
   */
  const initialState = { fetchStatus: initialFetchStatus, recordRawType };
  const dataSubjects: SavedSearchData = {
    main$: new BehaviorSubject<DataMainMsg>(initialState),
    documents$: new BehaviorSubject<DataDocumentsMsg>(initialState),
    totalHits$: new BehaviorSubject<DataTotalHitsMsg>(initialState),
    charts$: new BehaviorSubject<DataChartsMessage>(initialState),
    availableFields$: new BehaviorSubject<DataAvailableFieldsMsg>(initialState),
  };

  let autoRefreshDone: AutoRefreshDoneFn | undefined;
  /**
   * handler emitted by `timefilter.getAutoRefreshFetch$()`
   * to notify when data completed loading and to start a new autorefresh loop
   */
  const setAutoRefreshDone = (fn: AutoRefreshDoneFn | undefined) => {
    autoRefreshDone = fn;
  };
  const fetch$ = getFetch$({
    setAutoRefreshDone,
    data,
    main$: dataSubjects.main$,
    refetch$,
    searchSessionManager,
    initialFetchStatus,
  });
  let abortController: AbortController;

  function subscribe() {
    const subscription = fetch$.subscribe(async (val) => {
      if (
        !validateTimeRange(data.query.timefilter.timefilter.getTime(), services.toastNotifications)
      ) {
        return;
      }
      inspectorAdapters.requests.reset();

      abortController?.abort();
      abortController = new AbortController();
      const prevAutoRefreshDone = autoRefreshDone;

      await fetchAll(
        dataSubjects,
        savedSearchContainer.savedSearch$.getValue(),
        val === 'reset',
        appStateContainer.getState(),
        {
          abortController,
          data,
          initialFetchStatus,
          inspectorAdapters,
          searchSessionId: searchSessionManager.getNextSearchSessionId(),
          services,
        }
      );

      // If the autoRefreshCallback is still the same as when we started i.e. there was no newer call
      // replacing this current one, call it to make sure we tell that the auto refresh is done
      // and a new one can be scheduled.
      if (autoRefreshDone === prevAutoRefreshDone) {
        // if this function was set and is executed, another refresh fetch can be triggered
        autoRefreshDone?.();
        autoRefreshDone = undefined;
      }
    });

    return () => {
      abortController?.abort();
      subscription.unsubscribe();
    };
  }

  const fetchQuery = (resetQuery?: boolean) => {
    if (resetQuery) {
      refetch$.next('reset');
    } else {
      refetch$.next(undefined);
    }
    return refetch$;
  };

  const reset = () => sendResetMsg(dataSubjects, initialFetchStatus);

  return {
    fetch: fetchQuery,
    data$: dataSubjects,
    refetch$,
    subscribe,
    reset,
    inspectorAdapters,
    initialFetchStatus,
  };
}
