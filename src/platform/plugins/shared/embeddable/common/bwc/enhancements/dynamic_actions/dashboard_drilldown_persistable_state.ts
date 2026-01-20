/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { SerializedAction, SerializedEvent } from './types';

export type EnhancementsDashboardDrilldownConfig = {
  dashboardId?: string;
  useCurrentFilters: boolean;
  useCurrentDateRange: boolean;
  openInNewTab: boolean;
};

export const EMBEDDABLE_TO_DASHBOARD_DRILLDOWN = 'DASHBOARD_TO_DASHBOARD_DRILLDOWN';

const generateRefName = (eventId: string) =>
  `drilldown:${EMBEDDABLE_TO_DASHBOARD_DRILLDOWN}:${eventId}:dashboardId`;

export const dashboardDrilldownPersistableState = {
  extract: (state: SerializedEvent) => {
    const action = state.action as SerializedAction<EnhancementsDashboardDrilldownConfig>;
    const references: Reference[] = action.config.dashboardId
      ? [
          {
            name: generateRefName(state.eventId),
            type: 'dashboard',
            id: action.config.dashboardId,
          },
        ]
      : [];

    const { dashboardId, ...restOfConfig } = action.config;

    return {
      state: {
        ...state,
        action: {
          ...state.action,
          config: restOfConfig,
        } as unknown as SerializedAction,
      },
      references,
    };
  },
  inject: (state: SerializedEvent, references: Reference[]) => {
    const refName = generateRefName(state.eventId);
    const ref = references.find((r) => r.name === refName);
    return ref
      ? {
          ...state,
          action: {
            ...state.action,
            config: {
              ...state.action.config,
              dashboardId: ref.id,
            },
          },
        }
      : state;
  },
};
