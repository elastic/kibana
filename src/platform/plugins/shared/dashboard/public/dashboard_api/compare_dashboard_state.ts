/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { apiComparesSerializedState, areComparatorsEqual } from '@kbn/presentation-publishing';
import deepEqual from 'fast-deep-equal';
import { areLayoutsEqual } from './layout_manager/are_layouts_equal';
import { deserializeLayout } from './layout_manager/deserialize_layout';
import { approximationComparators } from './approximation_manager';
import { getProjectRoutingComparators } from './project_routing_manager';
import { dashboardSettingsMatch } from './settings_manager';
import { getUnifiedSearchComparators } from './unified_search_manager';

// time restore and project routing restore are settings, compared on their own by the settings check
const otherStateMatches = (baseline: DashboardState, current: DashboardState): boolean => {
  const timeRestore = Boolean(baseline.time_range) || Boolean(current.time_range);
  const projectRoutingRestore =
    Boolean(baseline.project_routing) || Boolean(current.project_routing);
  return areComparatorsEqual<
    Pick<
      DashboardState,
      | 'filters'
      | 'query'
      | 'refresh_interval'
      | 'time_range'
      | 'esql_approximation'
      | 'project_routing'
    >
  >(
    {
      ...getUnifiedSearchComparators(() => timeRestore),
      ...approximationComparators,
      ...getProjectRoutingComparators(() => projectRoutingRestore),
    },
    baseline,
    current
  );
};

const layoutMatches = (
  baseline: DashboardState,
  current: DashboardState,
  children?: { [id: string]: unknown }
): boolean => {
  const baselineLayout = deserializeLayout(baseline.panels, baseline.pinned_panels);
  const currentLayout = deserializeLayout(current.panels, current.pinned_panels);
  if (!areLayoutsEqual(baselineLayout.layout, currentLayout.layout)) {
    return false;
  }

  const panelIds = new Set([
    ...Object.keys(baselineLayout.childState),
    ...Object.keys(currentLayout.childState),
  ]);
  for (const panelId of panelIds) {
    const baselinePanel = baselineLayout.childState[panelId];
    const currentPanel = currentLayout.childState[panelId];
    const child = children?.[panelId];
    const panelsMatch = apiComparesSerializedState(child)
      ? child.compareSerializedState(baselinePanel, currentPanel)
      : deepEqual(baselinePanel, currentPanel);
    if (!panelsMatch) {
      return false;
    }
  }
  return true;
};

/**
 * Whether two dashboard states are equal under the unsaved-changes comparators.
 * Pass the open dashboard's children so each panel uses its own comparators.
 */
export const dashboardStatesMatch = (
  baseline: DashboardState,
  current: DashboardState,
  children?: { [id: string]: unknown }
): boolean =>
  dashboardSettingsMatch(baseline, current) &&
  otherStateMatches(baseline, current) &&
  layoutMatches(baseline, current, children);
