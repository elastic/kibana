/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateRefName } from './dynamic_actions/dashboard_drilldown_persistable_state';
import type { DynamicActionsState, SerializedEvent } from './dynamic_actions/types';

export function transformEnhancementsOut(
  enhancementsState: { dynamicActions?: DynamicActionsState },
) {
  if (!enhancementsState?.dynamicActions?.events) return {};

  return enhancementsState.dynamicActions.events.map((event) => {
    if (event.action.factoryId === 'DASHBOARD_TO_DASHBOARD_DRILLDOWN') {
      return transformDashboardDrilldown(event);
    }
  });
}

function transformDashboardDrilldown(event: SerializedEvent) {
  const { openInNewTab, useCurrentDateRange, useCurrentFilters, ...restOfConfig } =
      event.action.config;

  return {
    label: event.action.name,
    triggers: event.triggers,
    config: {
      type: 'dashboard_drilldown',
      dashboardRefName: generateRefName(event.eventId),
      ...restOfConfig,
      ...(typeof openInNewTab === 'boolean' ? { open_in_new_tab: openInNewTab } : {}),
      ...(typeof useCurrentDateRange === 'boolean'
        ? { use_time_range: useCurrentDateRange }
        : {}),
      ...(typeof useCurrentFilters === 'boolean' ? { use_filters: useCurrentFilters } : {}),
    },
  };
}
