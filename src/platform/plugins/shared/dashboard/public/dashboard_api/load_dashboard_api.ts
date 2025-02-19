/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContentInsightsClient } from '@kbn/content-management-content-insights-public';
import { DashboardPanelMap } from '../../common';
import { getDashboardContentManagementService } from '../services/dashboard_content_management_service';
import { DashboardCreationOptions, DashboardState } from './types';
import { getDashboardApi } from './get_dashboard_api';
import { startQueryPerformanceTracking } from '../dashboard_container/embeddable/create/performance/query_performance_tracking';
import { coreServices } from '../services/kibana_services';
import { logger } from '../services/logger';
import {
  PANELS_CONTROL_GROUP_KEY,
  getDashboardBackupService,
} from '../services/dashboard_backup_service';
import { UnsavedPanelState } from '../dashboard_container/types';
import { DEFAULT_DASHBOARD_STATE } from './default_dashboard_state';

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
  const initialPanelsRuntimeState: UnsavedPanelState = creationOptions?.useSessionStorageIntegration
    ? dashboardBackupState?.panels ?? {}
    : {};

  const sessionStorageInput = ((): Partial<DashboardState> | undefined => {
    if (!creationOptions?.useSessionStorageIntegration) return;
    return dashboardBackupState?.dashboardState;
  })();

  const combinedSessionState: DashboardState = {
    ...DEFAULT_DASHBOARD_STATE,
    ...(savedObjectResult?.dashboardInput ?? {}),
    ...sessionStorageInput,
  };
  combinedSessionState.references = sessionStorageInput?.references?.length
    ? sessionStorageInput?.references
    : savedObjectResult?.references;

  // --------------------------------------------------------------------------------------
  // Combine state with overrides.
  // --------------------------------------------------------------------------------------
  const overrideState = creationOptions?.getInitialInput?.();
  if (overrideState?.panels) {
    const overridePanels: DashboardPanelMap = {};
    for (const panel of Object.values(overrideState?.panels)) {
      overridePanels[panel.explicitInput.id] = {
        ...panel,

        /**
         * here we need to keep the state of the panel that was already in the Dashboard if one exists.
         * This is because this state will become the "last saved state" for this panel.
         */
        ...(combinedSessionState.panels[panel.explicitInput.id] ?? []),
      };
      /**
       * We also need to add the state of this react embeddable into the runtime state to be restored.
       */
      initialPanelsRuntimeState[panel.explicitInput.id] = panel.explicitInput;
    }
    overrideState.panels = overridePanels;
  }
  // Back up any view mode passed in explicitly.
  if (overrideState?.viewMode) {
    getDashboardBackupService().storeViewMode(overrideState?.viewMode);
  }
  if (overrideState?.controlGroupState) {
    initialPanelsRuntimeState[PANELS_CONTROL_GROUP_KEY] = overrideState.controlGroupState;
  }

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
    initialPanelsRuntimeState,
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
