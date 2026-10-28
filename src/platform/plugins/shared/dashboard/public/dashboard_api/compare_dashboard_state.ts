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
import { isDashboardSection } from '../../common';
import { deserializeLayout } from './layout_manager/deserialize_layout';
import { getLayoutChanges } from './layout_manager/get_layout_changes';
import { diffApproximationState } from './approximation_manager';
import { diffProjectRoutingState } from './project_routing_manager';
import { diffDashboardSettings } from './settings_manager';
import { diffUnifiedSearchState } from './unified_search_manager';

const getRefId = (config?: object) => (config && 'ref_id' in config ? config.ref_id : undefined);

// The baseline is usually the same last saved state object on every compare, and states are
// never mutated in place, so its deserialized layout is computed once.
const baselineLayoutCache = new WeakMap<DashboardState, ReturnType<typeof deserializeLayout>>();

const getBaselineLayout = (baseline: DashboardState) => {
  const cached = baselineLayoutCache.get(baseline);
  if (cached) return cached;
  const baselineLayout = deserializeLayout(baseline.panels, baseline.pinned_panels);
  baselineLayoutCache.set(baseline, baselineLayout);
  return baselineLayout;
};

// Panel configs keep their identity until the panel changes, so a compare result is reused while
// the child, the baseline config and the current config are the same objects.
const NO_CHILD = {};
const panelCompareCache = new WeakMap<object, WeakMap<object, WeakMap<object, boolean>>>();

const getCachedPanelChange = (
  child: object | undefined,
  baselineConfig: object | undefined,
  currentConfig: object | undefined,
  compare: () => boolean
) => {
  if (!baselineConfig || !currentConfig || shouldLogStateDiff()) return compare();
  const childKey = child ?? NO_CHILD;
  const byBaseline = panelCompareCache.get(childKey) ?? new WeakMap();
  panelCompareCache.set(childKey, byBaseline);
  const byCurrent = byBaseline.get(baselineConfig) ?? new WeakMap();
  byBaseline.set(baselineConfig, byCurrent);
  const cached = byCurrent.get(currentConfig);
  if (cached !== undefined) return cached;
  const isChanged = compare();
  byCurrent.set(currentConfig, isChanged);
  return isChanged;
};

// deserializeLayout copies each panel config, so read the original objects for the cache.
const getPanelConfigs = ({ panels, pinned_panels: pinnedPanels }: DashboardState) => {
  const configs: { [id: string]: object | undefined } = {};
  const addPanel = ({ id, config }: { id?: string; config?: object }) => {
    if (id) configs[id] = config;
  };
  panels?.forEach((widget) =>
    isDashboardSection(widget) ? widget.panels.forEach(addPanel) : addPanel(widget)
  );
  pinnedPanels?.forEach(addPanel);
  return configs;
};

const diffLayout = (
  baseline: DashboardState,
  current: DashboardState,
  children?: { [id: string]: unknown }
): Partial<Pick<DashboardState, 'panels' | 'pinned_panels'>> => {
  const baselineLayout = getBaselineLayout(baseline);
  const currentLayout = deserializeLayout(current.panels, current.pinned_panels);
  const currentConfigs = getPanelConfigs(current);

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
    const compare = () =>
      apiComparesSerializedState(child) && apiHasType(child) && child.type === currentType
        ? !child.compareSerializedState(
            baselinePanel,
            currentPanel,
            (key) => `panel: ${panelId}, key: ${key}`
          )
        : !deepEqual(baselinePanel, currentPanel);
    return getCachedPanelChange(
      typeof child === 'object' && child !== null ? child : undefined,
      baselinePanel,
      currentConfigs[panelId],
      compare
    );
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
