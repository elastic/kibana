/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/types';
import type { PersistableStateService } from '@kbn/kibana-utils-plugin/common';
import type { SerializedAction, SerializedEvent } from './types';

export type EnhancementsDashboardDrilldownConfig = {
  dashboardId?: string;
  useCurrentFilters: boolean;
  useCurrentDateRange: boolean;
  openInNewTab: boolean;
};

type DashboardDrilldownPersistableState = PersistableStateService<SerializedEvent>;

const generateRefName = (state: SerializedEvent, id: string) =>
  `drilldown:${id}:${state.eventId}:dashboardId`;

const injectDashboardId = (state: SerializedEvent, dashboardId: string): SerializedEvent => {
  return {
    ...state,
    action: {
      ...state.action,
      config: {
        ...state.action.config,
        dashboardId,
      },
    },
  };
};

export const createInject = ({
  drilldownId,
}: {
  drilldownId: string;
}): DashboardDrilldownPersistableState['inject'] => {
  return (state: SerializedEvent, references: SavedObjectReference[]) => {
    const action = state.action as SerializedAction<EnhancementsDashboardDrilldownConfig>;
    const refName = generateRefName(state, drilldownId);
    const ref = references.find((r) => r.name === refName);
    if (!ref) return state;
    if (ref.id && ref.id === action.config.dashboardId) return state;
    return injectDashboardId(state, ref.id);
  };
};

export const createExtract = ({
  drilldownId,
}: {
  drilldownId: string;
}): DashboardDrilldownPersistableState['extract'] => {
  return (state: SerializedEvent) => {
    const action = state.action as SerializedAction<EnhancementsDashboardDrilldownConfig>;
    const references: SavedObjectReference[] = action.config.dashboardId
      ? [
          {
            name: generateRefName(state, drilldownId),
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
  };
};
