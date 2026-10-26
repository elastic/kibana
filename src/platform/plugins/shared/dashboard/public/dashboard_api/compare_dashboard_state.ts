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
import { isDashboardSection } from '../../common';
import {
  arePanelLayoutsEqual,
  arePinnedPanelLayoutsEqual,
} from './layout_manager/are_layouts_equal';
import { deserializeLayout } from './layout_manager/deserialize_layout';
import { approximationComparators } from './approximation_manager';
import { getProjectRoutingComparators } from './project_routing_manager';
import { diffDashboardSettings } from './settings_manager';
import { getUnifiedSearchComparators } from './unified_search_manager';

// The current state only has time_range / project_routing while its restore flag is on, the
// flag unsaved changes reads. Flag changes themselves are reported by the settings diff.
const diffOtherState = (baseline: DashboardState, current: DashboardState) => {
  const timeRestore = Boolean(current.time_range);
  const projectRoutingRestore = Boolean(current.project_routing);
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

// ids are optional, so panels without one are matched by position instead of a random id
const deserializeComparableLayout = ({ panels, pinned_panels: pinnedPanels }: DashboardState) => {
  const takenIds = new Set(
    [
      ...(panels ?? []).flatMap((widget) =>
        isDashboardSection(widget) ? [widget, ...widget.panels] : [widget]
      ),
      ...(pinnedPanels ?? []),
    ].flatMap(({ id }) => (id ? [id] : []))
  );
  const positionId = (base: string) => {
    let id = base;
    while (takenIds.has(id)) id = `_${id}`;
    takenIds.add(id);
    return id;
  };

  return deserializeLayout(
    panels?.map((widget, index) => {
      const id = widget.id ?? positionId(`__position_${index}`);
      return isDashboardSection(widget)
        ? {
            ...widget,
            id,
            panels: widget.panels.map((panel, panelIndex) => ({
              ...panel,
              id: panel.id ?? positionId(`${id}_${panelIndex}`),
            })),
          }
        : { ...widget, id };
    }),
    pinnedPanels?.map((panel, index) => ({
      ...panel,
      id: panel.id ?? positionId(`__pinned_${index}`),
    }))
  );
};

const getRefId = (config?: object) => (config && 'ref_id' in config ? config.ref_id : undefined);

const diffLayout = (
  baseline: DashboardState,
  current: DashboardState,
  children?: { [id: string]: unknown }
): Partial<Pick<DashboardState, 'panels' | 'pinned_panels'>> => {
  const baselineLayout = deserializeComparableLayout(baseline);
  const currentLayout = deserializeComparableLayout(current);

  const panelChanged = (panelId: string, baselineType?: string, currentType?: string) => {
    if (baselineType !== currentType) return true;
    const baselinePanel = baselineLayout.childState[panelId];
    const currentPanel = currentLayout.childState[panelId];
    // live panel comparators skip ref_id since it is fixed for a loaded panel
    if (getRefId(baselinePanel) !== getRefId(currentPanel)) return true;
    const child = children?.[panelId];
    return apiComparesSerializedState(child) && apiHasType(child) && child.type === currentType
      ? !child.compareSerializedState(baselinePanel, currentPanel)
      : !deepEqual(baselinePanel, currentPanel);
  };

  const hasPanelChanges =
    !arePanelLayoutsEqual(baselineLayout.layout, currentLayout.layout) ||
    Object.entries(currentLayout.layout.panels).some(([panelId, { type }]) =>
      panelChanged(panelId, baselineLayout.layout.panels[panelId]?.type, type)
    );
  const hasPinnedPanelChanges =
    !arePinnedPanelLayoutsEqual(baselineLayout.layout, currentLayout.layout) ||
    Object.entries(currentLayout.layout.pinnedPanels).some(([panelId, { type }]) =>
      panelChanged(panelId, baselineLayout.layout.pinnedPanels[panelId]?.type, type)
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
): Partial<DashboardState> => ({
  ...diffDashboardSettings(baseline, current),
  ...diffOtherState(baseline, current),
  ...diffLayout(baseline, current, children),
});
