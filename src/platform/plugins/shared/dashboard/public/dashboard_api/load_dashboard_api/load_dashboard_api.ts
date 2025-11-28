/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContentInsightsClient } from '@kbn/content-management-content-insights-public';
import { getDashboardBackupService } from '../../services/dashboard_backup_service';
import { coreServices } from '../../services/kibana_services';
import { logger } from '../../services/logger';
import { getDashboardApi } from '../get_dashboard_api';
import { startQueryPerformanceTracking } from '../performance/query_performance_tracking';
import type { DashboardCreationOptions } from '../types';
import { transformPanels } from './transform_panels';
import { dashboardClient } from '../../dashboard_client';
import { DEFAULT_DASHBOARD_STATE } from '../default_dashboard_state';

export async function loadDashboardApi({
  getCreationOptions,
  savedObjectId,
}: {
  getCreationOptions?: () => Promise<DashboardCreationOptions>;
  savedObjectId?: string;
}) {
  const creationStartTime = performance.now();
  const creationOptions = await getCreationOptions?.();
  const incomingEmbeddables = creationOptions?.getIncomingEmbeddables?.();
  const readResult = savedObjectId ? await dashboardClient.get(savedObjectId) : undefined;

  const validationResult = readResult && creationOptions?.validateLoadedSavedObject?.(readResult);
  if (validationResult === 'invalid') {
    // throw error to stop the rest of Dashboard loading and make the factory throw an Error
    throw new Error('Dashboard failed saved object result validation');
  } else if (validationResult === 'redirected') {
    return;
  }

  const unsavedChanges = creationOptions?.useSessionStorageIntegration
    ? getDashboardBackupService().getState(savedObjectId)
    : undefined;

  const { viewMode, ...overrideState } = creationOptions?.getInitialInput?.() ?? {};
  if (overrideState.panels) {
    overrideState.panels = await transformPanels(overrideState.panels, overrideState.references);
  }

  // Back up any view mode passed in explicitly.
  if (viewMode) {
    getDashboardBackupService().storeViewMode(viewMode);
  }

  const { api, cleanup, internalApi } = getDashboardApi({
    creationOptions,
    incomingEmbeddables,
    initialState: {
      ...DEFAULT_DASHBOARD_STATE,
      ...readResult?.data,
      ...unsavedChanges,
      ...overrideState,
    },
    readResult,
    savedObjectId,
  });

  const performanceSubscription = startQueryPerformanceTracking(api, {
    firstLoad: true,
    creationStartTime,
  });

  if (savedObjectId && !incomingEmbeddables?.length) {
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
