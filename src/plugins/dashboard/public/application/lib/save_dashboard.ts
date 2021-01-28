/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { TimefilterContract } from '../../services/data';
import { SavedObjectSaveOpts } from '../../services/saved_objects';
import { updateSavedDashboard } from './update_saved_dashboard';
import { DashboardStateManager } from '../dashboard_state_manager';

/**
 * Saves the dashboard.
 * @param toJson A custom toJson function. Used because the previous code used
 * the angularized toJson version, and it was unclear whether there was a reason not to use
 * JSON.stringify
 * @returns A promise that if resolved, will contain the id of the newly saved
 * dashboard.
 */
export function saveDashboard(
  toJson: (obj: any) => string,
  timeFilter: TimefilterContract,
  dashboardStateManager: DashboardStateManager,
  saveOptions: SavedObjectSaveOpts
): Promise<string> {
  const savedDashboard = dashboardStateManager.savedDashboard;
  const appState = dashboardStateManager.appState;
  const hasTaggingCapabilities = dashboardStateManager.hasTaggingCapabilities;

  updateSavedDashboard(savedDashboard, appState, timeFilter, hasTaggingCapabilities, toJson);

  return savedDashboard.save(saveOptions).then((id: string) => {
    if (id) {
      // reset state only when save() was successful
      // e.g. save() could be interrupted if title is duplicated and not confirmed
      dashboardStateManager.lastSavedDashboardFilters = dashboardStateManager.getFilterState();
      dashboardStateManager.resetState();
    }

    return id;
  });
}
