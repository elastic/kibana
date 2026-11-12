/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { SerializedStateComparison } from '@kbn/presentation-publishing';
import { areComparatorsEqual, diffComparators } from '@kbn/presentation-publishing';
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

/** Resolves the stateless comparison rules registered for an embeddable type. */
export type GetStateComparison = (type: string) => Promise<SerializedStateComparison | undefined>;

const loadStateComparisons = async (
  types: string[],
  getStateComparison: GetStateComparison
): Promise<Map<string, SerializedStateComparison | undefined>> => {
  const entries = await Promise.all(
    [...new Set(types)].map(async (type) => {
      try {
        return [type, await getStateComparison(type)] as const;
      } catch (error) {
        logger.warn(`Unable to load the state comparison for panel type "${type}".`, { error });
        return [type, undefined] as const;
      }
    })
  );
  return new Map(entries);
};

const withComparisonIds = <Item extends LayoutItem>(
  items: Item[] | undefined,
  prefix: string
): Item[] =>
  (items ?? []).map((item, index) => ({
    ...item,
    id: item.id ?? `${prefix}${index}`,
    ...(item.panels && { panels: withComparisonIds(item.panels, `${prefix}${index}:`) }),
  }));

const diffLayout = async (
  baseline: DashboardState,
  current: DashboardState,
  getStateComparison: GetStateComparison
): Promise<Partial<Pick<DashboardState, 'panels' | 'pinned_panels'>>> => {
  const explicitIds = [
    ...getLayoutIds(baseline.panels),
    ...getLayoutIds(baseline.pinned_panels),
    ...getLayoutIds(current.panels),
    ...getLayoutIds(current.pinned_panels),
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

  const comparisons = await loadStateComparisons(
    [
      ...Object.values(currentLayout.layout.panels),
      ...Object.values(currentLayout.layout.pinnedPanels),
    ].map(({ type }) => type),
    getStateComparison
  );

  const isPanelChanged = (panelId: string) => {
    const currentType = getType(currentLayout, panelId);
    if (getType(baselineLayout, panelId) !== currentType) return true;
    const baselinePanel = baselineLayout.childState[panelId];
    const currentPanel = currentLayout.childState[panelId];
    if (getRefId(baselinePanel) !== getRefId(currentPanel)) return true;
    const comparison = currentType === undefined ? undefined : comparisons.get(currentType);
    try {
      return comparison
        ? !areComparatorsEqual(
            comparison.comparators,
            baselinePanel,
            currentPanel,
            comparison.defaultState
          )
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
 * produces. Panels are compared with the rules registered on their embeddable definition,
 * or by value when their type has none.
 */
export const diffDashboardStates = async (
  baseline: DashboardState,
  current: DashboardState,
  getStateComparison: GetStateComparison
): Promise<Partial<DashboardState>> => {
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
    ...(await diffLayout(baseline, current, getStateComparison)),
  };
};
