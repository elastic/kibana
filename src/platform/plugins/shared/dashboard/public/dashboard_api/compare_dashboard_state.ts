/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import {
  apiComparesSerializedState,
  apiHasType,
  logStateDiff,
  shouldLogStateDiff,
} from '@kbn/presentation-publishing';
import deepEqual from 'fast-deep-equal';
import { deserializeLayout } from './layout_manager/deserialize_layout';
import { getLayoutChanges } from './layout_manager/get_layout_changes';
import { diffApproximationState } from './approximation_manager';
import { diffProjectRoutingState } from './project_routing_manager';
import { diffDashboardSettings } from './settings_manager';
import { diffUnifiedSearchState } from './unified_search_manager';

const getRefId = (config?: object) => (config && 'ref_id' in config ? config.ref_id : undefined);

const diffLayout = (
  baseline: DashboardState,
  current: DashboardState,
  children?: { [id: string]: unknown }
): Partial<Pick<DashboardState, 'panels' | 'pinned_panels'>> => {
  const baselineLayout = deserializeLayout(baseline.panels, baseline.pinned_panels);
  const currentLayout = deserializeLayout(current.panels, current.pinned_panels);

  const getPanelType = ({ layout }: typeof baselineLayout, panelId: string) =>
    (layout.panels[panelId] ?? layout.pinnedPanels[panelId])?.type;

  const isPanelChanged = (panelId: string) => {
    const currentType = getPanelType(currentLayout, panelId);
    if (getPanelType(baselineLayout, panelId) !== currentType) return true;
    const baselinePanel = baselineLayout.childState[panelId];
    const currentPanel = currentLayout.childState[panelId];
    // live panel comparators skip ref_id since it is fixed for a loaded panel
    if (getRefId(baselinePanel) !== getRefId(currentPanel)) return true;
    const child = children?.[panelId];
    return apiComparesSerializedState(child) && apiHasType(child) && child.type === currentType
      ? !child.compareSerializedState(
          baselinePanel,
          currentPanel,
          (key) => `panel: ${panelId}, key: ${key}`
        )
      : !deepEqual(baselinePanel, currentPanel);
  };

  const { hasPanelChanges, hasPinnedPanelChanges } = getLayoutChanges(
    baselineLayout.layout,
    currentLayout.layout,
    isPanelChanged
  );

  if (shouldLogStateDiff()) {
    if (hasPanelChanges) logStateDiff('dashboard panels', baseline.panels, current.panels);
    if (hasPinnedPanelChanges) {
      logStateDiff('dashboard pinned panels', baseline.pinned_panels, current.pinned_panels);
    }
  }

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
): Partial<DashboardState> & ReturnType<typeof diffDashboardSettings> => {
  // The current state only has time_range / project_routing while its restore flag is on, the
  // flag unsaved changes reads. Flag changes themselves are reported by the settings diff.
  return {
    ...diffDashboardSettings(baseline, current),
    ...diffUnifiedSearchState(baseline, current, Boolean(current.time_range)),
    ...diffApproximationState(baseline, current),
    ...diffProjectRoutingState(baseline, current, Boolean(current.project_routing)),
    ...diffLayout(baseline, current, children),
  };
};
