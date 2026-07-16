/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { focusFirstFocusable, getRemovalFocusTarget } from '@kbn/presentation-util';
import type { DashboardLayout } from './types';
import { getAddPanelButton, getPanelElement } from './focus_targets';

interface VisualPosition {
  x: number;
  y: number;
}

const compareVisualPosition = (a: VisualPosition, b: VisualPosition) =>
  a.y === b.y ? a.x - b.x : a.y - b.y;

export const getPanelIdsInVisualOrder = (layout: DashboardLayout): string[] => {
  const pinnedPanelIds = Object.entries(layout.pinnedPanels)
    .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0))
    .map(([id]) => id);

  const topLevelItems: Array<VisualPosition & { panelIds: string[] }> = [];

  Object.entries(layout.panels).forEach(([id, panel]) => {
    if (!panel.grid.sectionId) {
      topLevelItems.push({ x: panel.grid.x, y: panel.grid.y, panelIds: [id] });
    }
  });

  Object.entries(layout.sections).forEach(([sectionId, section]) => {
    if (section.collapsed) {
      return;
    }

    const panelIds = Object.entries(layout.panels)
      .filter(([, panel]) => panel.grid.sectionId === sectionId)
      .sort(([, a], [, b]) => compareVisualPosition(a.grid, b.grid))
      .map(([id]) => id);

    if (panelIds.length > 0) {
      topLevelItems.push({ x: 0, y: section.grid.y, panelIds });
    }
  });

  return [
    ...pinnedPanelIds,
    ...topLevelItems.sort(compareVisualPosition).flatMap(({ panelIds }) => panelIds),
  ];
};

export const restoreFocusAfterPanelRemoval = (layout: DashboardLayout, removedPanelId: string) => {
  const panelIdsInVisualOrder = getPanelIdsInVisualOrder(layout);
  // Prefer a visual neighbor. When the removed panel is absent from visual order
  // (e.g. inside a collapsed section), focus the first remaining visible panel.
  const focusTargetPanelId =
    getRemovalFocusTarget(panelIdsInVisualOrder, removedPanelId) ??
    panelIdsInVisualOrder.find((id) => id !== removedPanelId);

  focusFirstFocusable(() => {
    if (!focusTargetPanelId) {
      return getAddPanelButton();
    }

    return getPanelElement(focusTargetPanelId) ?? getAddPanelButton();
  });
};
