/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';

import { dataService } from '../../services/kibana_services';
import type { DashboardApi, DashboardCreationOptions, DashboardInternalApi } from '../types';
import { startDashboardSearchSessionIntegration } from './start_dashboard_search_session_integration';

export function initializeSearchSessionManager(
  searchSessionSettings: DashboardCreationOptions['searchSessionSettings'],
  incomingEmbeddables: EmbeddablePackageState[] | undefined,
  dashboardApi: Omit<DashboardApi, 'searchSessionId$'>,
  dashboardInternalApi: DashboardInternalApi
) {
  const searchSessionId$ = new BehaviorSubject<string | undefined>(undefined);
  const searchSessionGenerationInProgress$ = new BehaviorSubject<boolean>(false);

  let stopSearchSessionIntegration: (() => void) | undefined;
  let requestSearchSessionId: (() => Promise<string | undefined>) | undefined;
  if (searchSessionSettings) {
    stopSearchSessionIntegration = startDashboardSearchSessionIntegration(
      {
        ...dashboardApi,
        searchSessionId$,
      },
      dashboardInternalApi,
      searchSessionSettings,
      (searchSessionId: string) => searchSessionId$.next(searchSessionId),
      searchSessionGenerationInProgress$
    );

    const { sessionIdToRestore } = searchSessionSettings;

    // if this incoming embeddable has a session, continue it.
    incomingEmbeddables?.forEach((embeddablePackage) => {
      if (embeddablePackage.searchSessionId) {
        dataService.search.session.continue(embeddablePackage.searchSessionId);
      }
    });
    if (sessionIdToRestore) {
      dataService.search.session.restore(sessionIdToRestore);
    }
    const existingSession = dataService.search.session.getSessionId();

    const initialSearchSessionId =
      sessionIdToRestore ??
      (existingSession && incomingEmbeddables?.length
        ? existingSession
        : dataService.search.session.start());
    searchSessionId$.next(initialSearchSessionId);

    // `requestSearchSessionId` should be used when you need to ensure that you have the up-to-date search session ID
    requestSearchSessionId = async () => {
      if (!searchSessionGenerationInProgress$.getValue()) return searchSessionId$.getValue();
      return new Promise((resolve) => {
        const subscription = searchSessionGenerationInProgress$.subscribe((inProgress) => {
          if (!inProgress) {
            resolve(searchSessionId$.getValue());
            subscription.unsubscribe();
          }
        });
      });
    };
  }
  return {
    api: {
      searchSessionId$,
      requestSearchSessionId,
    },
    cleanup: () => {
      stopSearchSessionIntegration?.();
    },
  };
}
