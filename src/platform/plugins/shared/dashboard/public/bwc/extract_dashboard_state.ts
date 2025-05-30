/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardState } from "@kbn/dashboard-plugin/common";
import { extractControlGroupState } from "./extract_control_group_state";
import { extractSettings } from "./extract_dashboard_settings";
import { extractSearchState } from "./extract_search_state";

export function extractDashboardState(state?: unknown): Partial<DashboardState> {
  let dashboardState: Partial<DashboardState> = {};
  if (state && typeof state === 'object') {
    const stateAsObject = state as { [key: string]: unknown };
    
    const controlGroupState = extractControlGroupState(stateAsObject);
    if (controlGroupState) dashboardState.controlGroupInput = controlGroupState;

    dashboardState = {
      ...dashboardState,
      ...extractSearchState(stateAsObject),
      ...extractSettings(stateAsObject)
    }
  }
  return dashboardState;
}