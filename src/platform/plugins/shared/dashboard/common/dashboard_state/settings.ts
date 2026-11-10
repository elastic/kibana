/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StateComparators, WithAllKeys } from '@kbn/presentation-publishing';
import type { DashboardState, DashboardOptions } from '@kbn/as-code-dashboard-schema';
import { DEFAULT_DASHBOARD_OPTIONS } from '../constants';

export type DashboardSettings = Required<DashboardOptions> & {
  description?: DashboardState['description'];
  tags: DashboardState['tags'];
  time_restore: boolean;
  project_routing_restore: boolean;
  title: DashboardState['title'];
};

export const DEFAULT_SETTINGS: WithAllKeys<DashboardSettings> = {
  ...DEFAULT_DASHBOARD_OPTIONS,
  description: undefined,
  tags: [],
  time_restore: false,
  project_routing_restore: false,
  title: '',
};

export const settingsComparators: StateComparators<DashboardSettings> = {
  title: 'referenceEquality',
  description: 'referenceEquality',
  hide_panel_titles: 'referenceEquality',
  hide_panel_borders: 'referenceEquality',
  sync_colors: 'referenceEquality',
  sync_cursor: 'referenceEquality',
  sync_tooltips: 'referenceEquality',
  auto_apply_filters: 'referenceEquality',
  time_restore: 'referenceEquality',
  use_margins: 'referenceEquality',
  project_routing_restore: 'referenceEquality',
  tags: 'deepEquality',
};

export function deserializeSettings(state: DashboardState) {
  return {
    ...state.options,
    description: state.description,
    tags: state.tags,
    time_restore: Boolean(state.time_range),
    project_routing_restore: Boolean(state.project_routing),
    title: state.title,
  };
}
