/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { DynamicActionsState } from './dynamic_actions/types';
import { enhancementsPersistableState } from './enhancements_persistable_state';

export function transformEnhancementsOut(
  enhancementsState: { dynamicActions?: DynamicActionsState },
  references: Reference[]
) {
  if (!enhancementsState?.dynamicActions?.events) return {};

  const events = enhancementsState.dynamicActions.events.map((event) => {
    if (event.action.factoryId !== 'DASHBOARD_TO_DASHBOARD_DRILLDOWN') {
      return event;
    }

    const { openInNewTab, useCurrentDateRange, useCurrentFilters, ...restOfConfig } =
      event.action.config;

    return {
      ...event,
      action: {
        ...event.action,
        config: {
          ...restOfConfig,
          ...(typeof openInNewTab === 'boolean' ? { open_in_new_tab: openInNewTab } : {}),
          ...(typeof useCurrentDateRange === 'boolean'
            ? { use_time_range: useCurrentDateRange }
            : {}),
          ...(typeof useCurrentFilters === 'boolean' ? { use_filters: useCurrentFilters } : {}),
        },
      },
    };
  });

  return enhancementsPersistableState.inject(
    {
      dynamicActions: {
        events,
      },
    },
    references
  );
}
