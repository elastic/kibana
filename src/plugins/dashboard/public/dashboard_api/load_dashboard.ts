/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject, first } from 'rxjs';
import { ContentInsightsClient } from '@kbn/content-management-content-insights-public';
import { getDashboardContentManagementService } from '../services/dashboard_content_management_service';
import { DashboardApi, DashboardCreationOptions } from './types';
import { initializeDashboard } from '../dashboard_container/embeddable/create/create_dashboard';
import { getDashboardApi } from './get_dashboard_api';
import { startQueryPerformanceTracking } from '../dashboard_container/embeddable/create/performance/query_performance_tracking';
import { coreServices } from '../services/kibana_services';

export async function loadDashboard({
  getCreationOptions,
  savedObjectId,
}: {
  getCreationOptions?: () => Promise<DashboardCreationOptions>;
  savedObjectId?: string;
}) {
  const creationStartTime = performance.now();
  const creationOptions = await getCreationOptions?.();
  const savedObjectResult = await getDashboardContentManagementService().loadDashboardState({
    id: savedObjectId,
  });

  const incomingEmbeddable = creationOptions?.getIncomingEmbeddable?.();

  // --------------------------------------------------------------------------------------
  // Create method which allows work to be done on the dashboard api when it's ready.
  // --------------------------------------------------------------------------------------
  const dashboardApiReady$ = new Subject<DashboardApi>();
  const untilDashboardReady = () =>
    new Promise<DashboardApi>((resolve) => {
      dashboardApiReady$.pipe(first()).subscribe((dashboardApi) => {
        resolve(dashboardApi);
      });
    });

  // --------------------------------------------------------------------------------------
  // Initialize Dashboard integrations
  // --------------------------------------------------------------------------------------
  const initializeResult = await initializeDashboard({
    loadDashboardReturn: savedObjectResult,
    untilDashboardReady,
    creationOptions,
  });
  if (!initializeResult) return;
  const { input: initialState } = initializeResult;

  const { api, cleanup, internalApi } = getDashboardApi({
    creationOptions,
    initialState,
    savedObjectResult,
    savedObjectId,
  });

  const performanceSubscription = startQueryPerformanceTracking(api, {
    firstLoad: true,
    creationStartTime,
  });

  if (savedObjectId && !incomingEmbeddable) {
    // We count a new view every time a user opens a dashboard, both in view or edit mode
    // We don't count views when a user is editing a dashboard and is returning from an editor after saving
    // however, there is an edge case that we now count a new view when a user is editing a dashboard and is returning from an editor by canceling
    // TODO: this should be revisited by making embeddable transfer support canceling logic https://github.com/elastic/kibana/issues/190485
    const contentInsightsClient = new ContentInsightsClient(
      { http: coreServices.http },
      { domainId: 'dashboard' }
    );
    contentInsightsClient.track(savedObjectId, 'viewed');
  }

  dashboardApiReady$.next(api);
  return {
    api,
    cleanup: () => {
      cleanup();
      performanceSubscription.unsubscribe();
    },
    internalApi
  };
}
