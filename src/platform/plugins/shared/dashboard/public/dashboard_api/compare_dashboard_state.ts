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
import { isDashboardSection } from '../../common';
import { isDevMode } from '../services/dev_mode';
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

/**
 * Compares two serialized panel states of one panel type without loading the panel, keyed by type.
 * Returns `true` when they are equal.
 */
export interface PanelTypeComparers {
  [panelType: string]: (baseline: object | undefined, current: object | undefined) => boolean;
}

// Panel configs keep their identity until the panel changes, so a compare result is reused while
// the comparer, the baseline config and the current config are the same objects.
const panelCompareCache = new WeakMap<object, WeakMap<object, WeakMap<object, boolean>>>();

const getCachedPanelChange = (
  comparerKey: object,
  baselineConfig: object | undefined,
  currentConfig: object | undefined,
  compare: () => boolean
) => {
  if (!baselineConfig || !currentConfig || shouldLogStateDiff()) return compare();
  const byBaseline = panelCompareCache.get(comparerKey) ?? new WeakMap();
  panelCompareCache.set(comparerKey, byBaseline);
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

// The caches above rely on panels never being mutated in place, so dev mode freezes them to throw
// on any such mutation. Frozen objects are skipped, since panel configs are shared across states.
const freezeInDevMode = (value: unknown) => {
  if (!isDevMode || typeof value !== 'object' || value === null || Object.isFrozen(value)) return;
  Object.values(value).forEach(freezeInDevMode);
  Object.freeze(value);
};

const diffLayout = (
  baseline: DashboardState,
  current: DashboardState,
  children?: { [id: string]: unknown },
  panelTypeComparers?: PanelTypeComparers
): Partial<Pick<DashboardState, 'panels' | 'pinned_panels'>> => {
  [baseline.panels, baseline.pinned_panels, current.panels, current.pinned_panels].forEach(
    freezeInDevMode
  );
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
    if (apiComparesSerializedState(child) && apiHasType(child) && child.type === currentType) {
      return getCachedPanelChange(
        child,
        baselinePanel,
        currentConfigs[panelId],
        () =>
          !child.compareSerializedState(
            baselinePanel,
            currentPanel,
            (key) => `panel: ${panelId}, key: ${key}`
          )
      );
    }
    // a panel that has not loaded is compared with its type's comparer
    const typeComparer = currentType ? panelTypeComparers?.[currentType] : undefined;
    // Until the comparer loads there is nothing to compare with, and loading it re-compares. A type
    // with no definition renders an error panel, whose config cannot change.
    if (!typeComparer) return false;
    return getCachedPanelChange(
      typeComparer,
      baselinePanel,
      currentConfigs[panelId],
      () => !typeComparer(baselinePanel, currentPanel)
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
 * produces. Pass the open dashboard's children so each panel uses its own comparators, and the
 * panel type comparers for panels that have not loaded.
 */
export const diffDashboardStates = (
  baseline: DashboardState,
  current: DashboardState,
  children?: { [id: string]: unknown },
  panelTypeComparers?: PanelTypeComparers
): Partial<DashboardState> & ReturnType<typeof diffDashboardSettings> => {
  // The current state only has time_range / project_routing while its restore flag is on, the
  // flag unsaved changes reads. Flag changes themselves are reported by the settings diff.
  return {
    ...diffDashboardSettings(baseline, current),
    ...diffUnifiedSearchState(baseline, current, Boolean(current.time_range)),
    ...diffApproximationState(baseline, current),
    ...diffProjectRoutingState(baseline, current, Boolean(current.project_routing)),
    ...diffLayout(baseline, current, children, panelTypeComparers),
  };
};
