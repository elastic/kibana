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

export function convertToDrilldowns(enhancementsState: { dynamicActions?: DynamicActionsState }) {
  if (!enhancementsState?.dynamicActions?.events) return {};

  return enhancementsState.dynamicActions.events
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
    .filter((drilldown) => Boolean(drilldown));
}

function convertToDashboardDrilldown(event: SerializedEvent) {
  const { openInNewTab, useCurrentDateRange, useCurrentFilters } = event.action.config;

  return {
    label: event.action.name,
    triggers: event.triggers,
    config: {
      type: 'dashboard_drilldown',
      dashboardRefName: generateRefName(event.eventId),
      open_in_new_tab: openInNewTab ?? false,
      use_time_range: useCurrentDateRange ?? true,
      use_filters: useCurrentFilters ?? true,
    },
  };
}

function convertToDiscoverDrilldown(event: SerializedEvent) {
  const { openInNewTab } = event.action.config;

  return {
    label: event.action.name,
    triggers: event.triggers,
    config: {
      type: 'discover_drilldown',
      open_in_new_tab: openInNewTab ?? false,
    },
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
    triggers: event.triggers,
    config: {
      type: 'url_drilldown',
      encode_url: encodeUrl ?? true,
      open_in_new_tab: openInNewTab ?? true,
      url: url?.template ?? '',
    },
  };
}
