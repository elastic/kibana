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
import type { DashboardApi, DashboardCreationOptions, DashboardInternalApi } from '../types';
import { dataService } from '../../services/kibana_services';
import { startDashboardSearchSessionIntegration } from './start_dashboard_search_session_integration';

export function initializeSearchSessionManager(
  searchSessionSettings: DashboardCreationOptions['searchSessionSettings'],
  incomingEmbeddables: EmbeddablePackageState[] | undefined,
  dashboardApi: Omit<DashboardApi, 'searchSessionId$'>,
  dashboardInternalApi: DashboardInternalApi
) {
  const searchSessionId$ = new BehaviorSubject<string | undefined>(undefined);

  let stopSearchSessionIntegration: (() => void) | undefined;
  if (searchSessionSettings) {
    const { sessionIdToRestore } = searchSessionSettings;
    const initialSearchSessionId = sessionIdToRestore ?? dataService.search.session.start();
    searchSessionId$.next(initialSearchSessionId);

    stopSearchSessionIntegration = startDashboardSearchSessionIntegration(
      {
        ...dashboardApi,
        searchSessionId$,
      },
      dashboardInternalApi,
      searchSessionSettings,
      (searchSessionId: string) => searchSessionId$.next(searchSessionId)
    );
  }
  return {
    api: {
      searchSessionId$,
    },
    cleanup: () => {
      stopSearchSessionIntegration?.();
    },
  };
}
