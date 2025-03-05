/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContentInsightsClient } from '@kbn/content-management-content-insights-public';
import { cloneDeep } from 'lodash';
import { startQueryPerformanceTracking } from '../dashboard_container/embeddable/create/performance/query_performance_tracking';
import { getDashboardBackupService } from '../services/dashboard_backup_service';
import { getDashboardContentManagementService } from '../services/dashboard_content_management_service';
import { coreServices } from '../services/kibana_services';
import { logger } from '../services/logger';
import { DEFAULT_DASHBOARD_INPUT } from './default_dashboard_input';
import { getDashboardApi } from './get_dashboard_api';
import { DashboardCreationOptions, DashboardState } from './types';

export async function loadDashboardApi({
  getCreationOptions,
  savedObjectId,
}: {
  getCreationOptions?: () => Promise<DashboardCreationOptions>;
  savedObjectId?: string;
}) {
  const creationStartTime = performance.now();
  const creationOptions = await getCreationOptions?.();
  const incomingEmbeddable = creationOptions?.getIncomingEmbeddable?.();
  const savedObjectResult = await getDashboardContentManagementService().loadDashboardState({
    id: savedObjectId,
  });

  // --------------------------------------------------------------------------------------
  // Run validation.
  // --------------------------------------------------------------------------------------
  const validationResult =
    savedObjectResult && creationOptions?.validateLoadedSavedObject?.(savedObjectResult);
  if (validationResult === 'invalid') {
    // throw error to stop the rest of Dashboard loading and make the factory throw an Error
    throw new Error('Dashboard failed saved object result validation');
  } else if (validationResult === 'redirected') {
    return;
  }

  // --------------------------------------------------------------------------------------
  // Combine saved object state and session storage state
  // --------------------------------------------------------------------------------------
  const dashboardBackupState = getDashboardBackupService().getState(savedObjectResult.dashboardId);

  const sessionStorageInput = ((): Partial<DashboardState> | undefined => {
    if (!creationOptions?.useSessionStorageIntegration) return;
    return dashboardBackupState;
  })();

  const lastSavedDashboardState: DashboardState = cloneDeep({
    ...DEFAULT_DASHBOARD_INPUT,
    ...(savedObjectResult?.dashboardInput ?? {}),
    references: savedObjectResult?.references,
  });

  const combinedSessionState: DashboardState = {
    ...lastSavedDashboardState,
    ...sessionStorageInput,
    panels: {
      ...lastSavedDashboardState.panels,

      /**
       * Panels are spread from the session storage input because only panels which have changed are backed up there.
       */
      ...sessionStorageInput?.panels,
    },
  };
  combinedSessionState.references = sessionStorageInput?.references?.length
    ? sessionStorageInput?.references
    : savedObjectResult?.references;

  // --------------------------------------------------------------------------------------
  // Combine state with overrides.
  // --------------------------------------------------------------------------------------
  const overrideState = creationOptions?.getInitialInput?.();
  if (overrideState?.viewMode) getDashboardBackupService().storeViewMode(overrideState?.viewMode);

  // --------------------------------------------------------------------------------------
  // get dashboard Api
  // --------------------------------------------------------------------------------------
  const { api, cleanup, internalApi } = getDashboardApi({
    creationOptions,
    incomingEmbeddable,
    initialState: {
      ...combinedSessionState,
      ...overrideState,
    },
    lastSavedDashboardState,
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
      { http: coreServices.http, logger },
      { domainId: 'dashboard' }
    );
    contentInsightsClient.track(savedObjectId, 'viewed');
  }

  return {
    api,
    cleanup: () => {
      cleanup();
      performanceSubscription.unsubscribe();
    },
    internalApi,
  };
}
