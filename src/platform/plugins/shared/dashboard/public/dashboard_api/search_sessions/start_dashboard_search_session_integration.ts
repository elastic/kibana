/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type BehaviorSubject, combineLatest, filter, skip } from 'rxjs';

import { noSearchSessionStorageCapabilityMessage } from '@kbn/data-plugin/public';

import type { DashboardApi, DashboardCreationOptions } from '../..';
import { dataService } from '../../services/kibana_services';
import { getDashboardCapabilities } from '../../utils/get_dashboard_capabilities';
import type { DashboardInternalApi } from '../types';
import { newSession$ } from './new_session';

/**
 * Enables dashboard search sessions.
 */
export function startDashboardSearchSessionIntegration(
  dashboardApi: DashboardApi,
  dashboardInternalApi: DashboardInternalApi,
  searchSessionSettings: DashboardCreationOptions['searchSessionSettings'],
  setSearchSessionId: (searchSessionId: string) => void,
  searchSessionGenerationInProgress$: BehaviorSubject<boolean>,
  startSearchSession: () => string,
  restoreSearchSession: (sessionId: string) => void
) {
  if (!searchSessionSettings) return;

  const {
    sessionIdUrlChangeObservable,
    getSearchSessionIdFromURL,
    removeSessionIdFromUrl,
    createSessionRestorationDataProvider,
  } = searchSessionSettings;

  dataService.search.session.enableStorage(
    createSessionRestorationDataProvider(dashboardApi, dashboardInternalApi),
    {
      isDisabled: () => {
        if (dashboardApi.replayCacheLastFetched$.value !== undefined) {
          return { disabled: true, reasonText: '' };
        }
        if (!getDashboardCapabilities().storeSearchSession) {
          return { disabled: true, reasonText: noSearchSessionStorageCapabilityMessage };
        }
        return { disabled: false };
      },
    }
  );

  // force refresh when the session id in the URL changes. This will also fire off the "handle search session change" below.
  const searchSessionIdChangeSubscription = sessionIdUrlChangeObservable
    ?.pipe(skip(1))
    .subscribe(() => dashboardApi.forceRefresh());

  const newSessionSubscription = combineLatest([
    newSession$(dashboardApi),
    dashboardApi.isFetchPaused$,
  ])
    .pipe(
      filter(([, isFetchPaused]) => !isFetchPaused), // don't generate new search session until fetch is unpaused
      skip(1) // ignore first emit since search session ID is initialized
    )
    .subscribe(() => {
      searchSessionGenerationInProgress$.next(true);

      const currentSearchSessionId = dashboardApi.searchSessionId$.value;

      const updatedSearchSessionId: string | undefined = (() => {
        let searchSessionIdFromURL = getSearchSessionIdFromURL();
        if (searchSessionIdFromURL) {
          if (
            dataService.search.session.isRestore() &&
            dataService.search.session.isCurrentSession(searchSessionIdFromURL)
          ) {
            // we had previously been in a restored session but have now changed state so remove the session id from the URL.
            removeSessionIdFromUrl();
            searchSessionIdFromURL = undefined;
          } else {
            restoreSearchSession(searchSessionIdFromURL);
          }
        }
        return searchSessionIdFromURL ?? startSearchSession();
      })();

      if (updatedSearchSessionId && updatedSearchSessionId !== currentSearchSessionId) {
        setSearchSessionId(updatedSearchSessionId);
      }

      searchSessionGenerationInProgress$.next(false);
    });

  return () => {
    searchSessionIdChangeSubscription?.unsubscribe();
    newSessionSubscription.unsubscribe();
  };
}
