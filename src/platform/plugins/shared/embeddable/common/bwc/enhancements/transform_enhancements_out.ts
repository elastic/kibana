/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DrilldownsState } from '../../../server';
import { generateRefName } from './dynamic_actions/dashboard_drilldown_persistable_state';
import type { DynamicActionsState, SerializedEvent } from './dynamic_actions/types';

export function transformEnhancementsOut<StoredState extends DrilldownsState>(
  state: StoredState & { enhancements?: { dynamicActions?: DynamicActionsState } }
): StoredState {
  const { enhancements, ...restOfState } = state;

  if (
    !enhancements?.dynamicActions?.events ||
    !Array(enhancements.dynamicActions.events) ||
    !enhancements.dynamicActions.events.length
  ) {
    return restOfState as StoredState;
  }

  const drilldownsFromEnhancements = enhancements.dynamicActions.events
    .map((event) => {
      if (event.action.factoryId === 'DASHBOARD_TO_DASHBOARD_DRILLDOWN') {
        return convertToDashboardDrilldown(event);
      }

      if (event.action.factoryId === 'OPEN_IN_DISCOVER_DRILLDOWN') {
        return convertToDiscoverDrilldown(event);
      }

      if (event.action.factoryId === 'URL_DRILLDOWN') {
        return convertToUrlDrilldown(event);
      }
    })
    .filter((drilldown) => drilldown !== undefined);

  return drilldownsFromEnhancements.length
    ? {
        ...(restOfState as StoredState),
        drilldowns: [...drilldownsFromEnhancements, ...(restOfState.drilldowns ?? [])],
      }
    : (restOfState as StoredState);
}

function convertToDashboardDrilldown(event: SerializedEvent) {
  const { openInNewTab, useCurrentDateRange, useCurrentFilters } = event.action.config;

  return {
    dashboardRefName: generateRefName(event.eventId),
    label: event.action.name,
    open_in_new_tab: openInNewTab ?? false,
    trigger: event.triggers[0] ?? 'unknown',
    type: 'dashboard_drilldown',
    use_filters: useCurrentFilters ?? true,
    use_time_range: useCurrentDateRange ?? true,
  };
}

function convertToDiscoverDrilldown(event: SerializedEvent) {
  const { openInNewTab } = event.action.config;

  return {
    label: event.action.name,
    open_in_new_tab: openInNewTab ?? false,
    trigger: event.triggers[0] ?? 'unknown',
    type: 'discover_drilldown',
  };
}

function convertToUrlDrilldown(event: SerializedEvent) {
  const { encodeUrl, openInNewTab, url } = event.action.config as {
    encodeUrl?: boolean;
    openInNewTab?: boolean;
    url?: { template?: string };
  };
  return {
    label: event.action.name,
    encode_url: encodeUrl ?? true,
    open_in_new_tab: openInNewTab ?? true,
    trigger: event.triggers[0] ?? 'unknown',
    type: 'url_drilldown',
    url: url?.template ?? '',
  };
}
