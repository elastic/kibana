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
  diffComparators,
} from '@kbn/presentation-publishing';
import deepEqual from 'fast-deep-equal';
import { getLayoutChanges } from './layout_manager/are_layouts_equal';
import { deserializeLayout } from './layout_manager/deserialize_layout';
import { approximationComparators } from './approximation_manager';
import { logger } from '../services/logger';
import { getProjectRoutingComparators } from './project_routing_manager';
import { diffDashboardSettings } from './settings_manager';
import { getUnifiedSearchComparators } from './unified_search_manager';

const getRefId = (config?: object) => (config && 'ref_id' in config ? config.ref_id : undefined);

interface LayoutItem {
  id?: string;
  panels?: LayoutItem[];
}

const getLayoutIds = (items: LayoutItem[] = []): string[] =>
  items.flatMap(({ id, panels }) => [...(id === undefined ? [] : [id]), ...getLayoutIds(panels)]);

const withComparisonIds = <Item extends LayoutItem>(
  items: Item[] | undefined,
  prefix: string
): Item[] =>
  (items ?? []).map((item, index) => ({
    ...item,
    id: item.id ?? `${prefix}${index}`,
    ...(item.panels && { panels: withComparisonIds(item.panels, `${prefix}${index}:`) }),
  }));

const diffLayout = (
  baseline: DashboardState,
  current: DashboardState,
  children?: { [id: string]: unknown }
): Partial<Pick<DashboardState, 'panels' | 'pinned_panels'>> => {
  const explicitIds = [
    ...getLayoutIds(baseline.panels),
    ...getLayoutIds(baseline.pinned_panels),
    ...getLayoutIds(current.panels),
    ...getLayoutIds(current.pinned_panels),
    ...Object.keys(children ?? {}),
  ];
  let prefix = '__comparison:';
  while (explicitIds.some((id) => id.startsWith(prefix))) {
    prefix = `_${prefix}`;
  }
  const baselineLayout = deserializeLayout(
    withComparisonIds(baseline.panels, `${prefix}panel:`),
    withComparisonIds(baseline.pinned_panels, `${prefix}pinned:`)
  );
  const currentLayout = deserializeLayout(
    withComparisonIds(current.panels, `${prefix}panel:`),
    withComparisonIds(current.pinned_panels, `${prefix}pinned:`)
  );

  const getType = ({ layout }: typeof baselineLayout, panelId: string) =>
    (layout.panels[panelId] ?? layout.pinnedPanels[panelId])?.type;

  const isPanelChanged = (panelId: string) => {
    const currentType = getType(currentLayout, panelId);
    if (getType(baselineLayout, panelId) !== currentType) return true;
    const baselinePanel = baselineLayout.childState[panelId];
    const currentPanel = currentLayout.childState[panelId];
    // live panel comparators skip ref_id since it is fixed for a loaded panel
    if (getRefId(baselinePanel) !== getRefId(currentPanel)) return true;
    const child = children?.[panelId];
    try {
      return apiComparesSerializedState(child) && apiHasType(child) && child.type === currentType
        ? !child.compareSerializedState(baselinePanel, currentPanel)
        : !deepEqual(baselinePanel, currentPanel);
    } catch (error) {
      logger.warn(`Unable to compare serialized state for dashboard panel "${panelId}".`, {
        error,
      });
      // A failed comparison cannot establish equality.
      return true;
    }
  };

  const { hasPanelChanges, hasPinnedPanelChanges } = getLayoutChanges(
    baselineLayout.layout,
    currentLayout.layout,
    isPanelChanged
  );

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
): Partial<DashboardState> => {
  // The current state only has time_range / project_routing while its restore flag is on, the
  // flag unsaved changes reads. Flag changes themselves are reported by the settings diff.
  const timeRestore = Boolean(current.time_range);
  const projectRoutingRestore = Boolean(current.project_routing);
  return {
    ...diffDashboardSettings(baseline, current),
    ...diffComparators<
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
    ),
    ...diffLayout(baseline, current, children),
  };
};
