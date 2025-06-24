/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardState } from '../../../../common';
import { extractControlGroupState } from './extract_control_group_state';
import { extractSettings } from './extract_dashboard_settings';
import { extractPanelsState } from './extract_panels_state';
import { extractSearchState } from './extract_search_state';

export function extractDashboardState(state?: unknown): Partial<DashboardState> {
  let dashboardState: Partial<DashboardState> = {};
  if (state && typeof state === 'object') {
    const stateAsObject = state as { [key: string]: unknown };

    const controlGroupState = extractControlGroupState(stateAsObject);
    if (controlGroupState) dashboardState.controlGroupInput = controlGroupState;

    if (Array.isArray(stateAsObject.references))
      dashboardState.references = stateAsObject.references;

    if (typeof stateAsObject.viewMode === 'string')
      dashboardState.viewMode = stateAsObject.viewMode as DashboardState['viewMode'];

    dashboardState = {
      ...dashboardState,
      ...extractPanelsState(stateAsObject),
      ...extractSearchState(stateAsObject),
      ...extractSettings(stateAsObject),
    };
  }
  return dashboardState;
}
