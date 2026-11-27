/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardSection } from '@kbn/as-code-dashboard-schema';
import { PlacementStrategy } from '@kbn/embeddable-plugin/public';
import { runPanelPlacementStrategy } from '../../panel_placement';
import type { DashboardLayout } from './types';

/** Returns the row right below every panel and section, where a new section can be added */
export const getLayoutBottomRow = ({ panels, sections }: DashboardLayout): number => {
  let maxY = 0;
  [...Object.values(panels), ...Object.values(sections)].forEach((widget) => {
    const { y, h } = { h: 1, ...widget.grid };
    maxY = Math.max(maxY, y + h);
  });
  return maxY;
};

/**
 * Moves the given grid panels into a new expanded section at the bottom of the layout.
 * The panels are packed into the section top-left first, in the order they appear in the dashboard.
 * Returns `undefined` when none of the IDs belong to a grid panel.
 */
export const groupPanelsInSection = (
  layout: DashboardLayout,
  panelIds: readonly string[],
  newSection: Required<Pick<DashboardSection, 'id' | 'title'>>
): DashboardLayout | undefined => {
  const { panels, sections } = layout;
  const panelIdsToMove = panelIds.filter((id) => Object.hasOwn(panels, id));
  if (!panelIdsToMove.length) return;

  // Sorts panels in dashboard order by comparing [dashboard row, row, column] one element at a time.
  // A panel in a section uses its section's header row as its dashboard row, because its own
  // y is relative to the section. So a section's panels sort together where the section sits,
  // and ties fall through to the panel's row, then its column.
  const getDashboardOrder = (id: string) => {
    const { sectionId, y, x } = panels[id].grid;
    return [sectionId ? sections[sectionId].grid.y : y, y, x];
  };
  const sortedPanelIds = [...panelIdsToMove].sort((idA, idB) => {
    const orderA = getDashboardOrder(idA);
    const orderB = getDashboardOrder(idB);
    const index = orderA.findIndex((value, i) => value !== orderB[i]);
    return index === -1 ? 0 : orderA[index] - orderB[index];
  });

  const layoutWithSection: DashboardLayout = {
    ...layout,
    sections: {
      ...sections,
      [newSection.id]: {
        grid: { y: getLayoutBottomRow(layout) },
        title: newSection.title,
        collapsed: false,
      },
    },
  };

  return sortedPanelIds.reduce((currentLayout, id) => {
    const { type, grid } = panels[id];
    return runPanelPlacementStrategy(PlacementStrategy.findTopLeftMostOpenSpace, {
      currentLayout,
      newPanel: { uuid: id, type, grid: { w: grid.w, h: grid.h, sectionId: newSection.id } },
    });
  }, layoutWithSection);
};
