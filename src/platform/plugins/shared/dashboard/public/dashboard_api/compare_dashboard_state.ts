/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { apiComparesSerializedState, diffComparators } from '@kbn/presentation-publishing';
import deepEqual from 'fast-deep-equal';
import {
  arePanelLayoutsEqual,
  arePinnedPanelLayoutsEqual,
} from './layout_manager/are_layouts_equal';
import { deserializeLayout } from './layout_manager/deserialize_layout';
import { approximationComparators } from './approximation_manager';
import { getProjectRoutingComparators } from './project_routing_manager';
import { diffDashboardSettings } from './settings_manager';
import { getUnifiedSearchComparators } from './unified_search_manager';

// time restore and project routing restore are settings, diffed on their own by the settings diff
const diffOtherState = (baseline: DashboardState, current: DashboardState) => {
  const timeRestore = Boolean(baseline.time_range) || Boolean(current.time_range);
  const projectRoutingRestore =
    Boolean(baseline.project_routing) || Boolean(current.project_routing);
  return diffComparators<
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

const diffLayout = (
  baseline: DashboardState,
  current: DashboardState,
  children?: { [id: string]: unknown }
): Partial<Pick<DashboardState, 'panels' | 'pinned_panels'>> => {
  const baselineLayout = deserializeLayout(baseline.panels, baseline.pinned_panels);
  const currentLayout = deserializeLayout(current.panels, current.pinned_panels);

  const panelChanged = (panelId: string) => {
    const baselinePanel = baselineLayout.childState[panelId];
    const currentPanel = currentLayout.childState[panelId];
    const child = children?.[panelId];
    return apiComparesSerializedState(child)
      ? !child.compareSerializedState(baselinePanel, currentPanel)
      : !deepEqual(baselinePanel, currentPanel);
  };

  const hasPanelChanges =
    !arePanelLayoutsEqual(baselineLayout.layout, currentLayout.layout) ||
    Object.keys(currentLayout.layout.panels).some(panelChanged);
  const hasPinnedPanelChanges =
    !arePinnedPanelLayoutsEqual(baselineLayout.layout, currentLayout.layout) ||
    Object.keys(currentLayout.layout.pinnedPanels).some(panelChanged);

  return {
    ...(hasPanelChanges && { panels: current.panels ?? [] }),
    ...(hasPinnedPanelChanges && { pinned_panels: current.pinned_panels ?? [] }),
  };
};

/**
 * The changes from `baseline` to `current`, in the same shape the unsaved-changes manager
 * produces. Pass the open dashboard's children so each panel uses its own comparators.
 */
export const diffDashboardStates = (
  baseline: DashboardState,
  current: DashboardState,
  children?: { [id: string]: unknown }
): Partial<DashboardState> => ({
  ...diffDashboardSettings(baseline, current),
  ...diffOtherState(baseline, current),
  ...diffLayout(baseline, current, children),
});
