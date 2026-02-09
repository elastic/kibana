/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import { ContentInsightsClient } from '@kbn/content-management-content-insights-public';
import { dashboardClient } from '../../dashboard_client';
import { applyControlFiltersToPanels } from '../../dashboard_app/url/bwc/apply_control_filters_to_panels';
import { getPanelSettings } from '../../panel_placement/get_panel_placement_settings';
import { DEFAULT_PANEL_PLACEMENT_SETTINGS } from '../../plugin_constants';
import { getAccessControlClient } from '../../services/access_control_service';
import { getDashboardBackupService } from '../../services/dashboard_backup_service';
import { coreServices } from '../../services/kibana_services';
import { logger } from '../../services/logger';
import { getLastSavedState } from '../default_dashboard_state';
import { getDashboardApi } from '../get_dashboard_api';
import { DASHBOARD_DURATION_START_MARK } from '../performance/dashboard_duration_start_mark';
import { startQueryPerformanceTracking } from '../performance/query_performance_tracking';
import type { DashboardCreationOptions } from '../types';
import { getUserAccessControlData } from './get_user_access_control_data';
import { transformPanels } from './transform_panels';

export async function loadDashboardApi({
  getCreationOptions,
  savedObjectId,
}: {
  getCreationOptions?: () => Promise<DashboardCreationOptions>;
  savedObjectId?: string;
}) {
  const creationOptions = await getCreationOptions?.();

  // --------------------------------------------------------------------------------------
  // Determine sizes of incoming embeddables. Done here due to async fetching.
  // --------------------------------------------------------------------------------------
  const incomingEmbeddables = creationOptions?.getIncomingEmbeddables?.();
  for (const embeddable of incomingEmbeddables ?? []) {
    if (embeddable.size) continue; // don't overwrite size if it was provided
    // otherwise, use the panel settings to determine the size
    const panelSettings = await getPanelSettings(embeddable.type, embeddable.serializedState);
    const panelPlacementSettings = {
      ...DEFAULT_PANEL_PLACEMENT_SETTINGS,
      ...panelSettings?.placementSettings,
    };
    embeddable.size = panelPlacementSettings;
  }

  const [readResult, user, isAccessControlEnabled] = savedObjectId
    ? await Promise.all([
        dashboardClient.get(savedObjectId),
        getUserAccessControlData(),
        getAccessControlClient().isAccessControlEnabled(),
      ])
    : [undefined, undefined, undefined];

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

  // Get the base state from saved dashboard
  const lastSavedState = getLastSavedState(readResult);

  // Apply control filters from navigation to matching controls on this dashboard.
  // This allows control selections to persist when navigating between dashboards
  // that have the same controls (same field and data view), rather than appearing
  // as top-level filters in the filter bar.
  //
  // When overrideState.filters is defined (even if empty), we use the saved state
  // for pinned_panels rather than unsaved changes. This ensures that navigating
  // without filters doesn't retain control selections from previous navigations.
  const controlFilterOverrides: {
    pinned_panels?: typeof lastSavedState.pinned_panels;
    filters?: Filter[];
  } = {};

  if (overrideState.filters !== undefined) {
    // Start with saved state for controls (not unsaved changes)
    controlFilterOverrides.pinned_panels = lastSavedState?.pinned_panels;

    // Apply any incoming filters to matching controls
    if (overrideState.filters.length && lastSavedState?.pinned_panels?.length) {
      const { updatedPinnedPanels, remainingFilters } = applyControlFiltersToPanels(
        overrideState.filters as Filter[],
        lastSavedState.pinned_panels
      );
      controlFilterOverrides.pinned_panels = updatedPinnedPanels;
      controlFilterOverrides.filters = remainingFilters;
    }
  }

  const { api, cleanup, internalApi } = getDashboardApi({
    creationOptions,
    incomingEmbeddables,
    initialState: {
      ...lastSavedState,
      ...unsavedChanges,
      ...overrideState,
      // Override with the merged values after applying control filters (only if we processed any)
      ...controlFilterOverrides,
    },
    readResult,
    savedObjectId,
    user,
    isAccessControlEnabled,
  });

  const performanceSubscription = startQueryPerformanceTracking(api, {
    firstLoad: true,
    creationStartTime: performance.getEntriesByName(DASHBOARD_DURATION_START_MARK, 'mark')[0]
      ?.startTime,
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
    useControlsIntegration: creationOptions?.useControlsIntegration,
  };
}
