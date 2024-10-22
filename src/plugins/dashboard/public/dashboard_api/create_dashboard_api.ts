/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject, first } from 'rxjs';
import { getDashboardContentManagementService } from '../services/dashboard_content_management_service';
import { DashboardApi, DashboardCreationOptions } from './types';
import { initializeDashboard } from '../dashboard_container/embeddable/create/create_dashboard';
import { getDashboardApi } from './get_dashboard_api';

export async function createDashboardApi({
  getCreationOptions,
  savedObjectId,
}: {
  getCreationOptions?: () => Promise<DashboardCreationOptions>;
  savedObjectId?: string;
}) {
  const creationOptions = await getCreationOptions?.();
  const savedObjectResult = await getDashboardContentManagementService().loadDashboardState({
    id: savedObjectId,
  });

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

  dashboardApiReady$.next(api);
  return { api, cleanup, internalApi };
}
