/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardSection } from '@kbn/as-code-dashboard-schema';
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
 * The panels are grouped by source: each section, and each run of top-level panels between two
 * section headers. Panels keep their arrangement relative to the others from the same source, and
 * the sources are stacked in the order they appear in the dashboard.
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

  // top-level panels share the dashboard's rows with the section headers
  const sectionRows = Object.values(sections).map(({ grid }) => grid.y);
  const panelIdsBySource = new Map<string, { ids: string[]; dashboardRow?: number }>();
  panelIdsToMove.forEach((id) => {
    const { sectionId, y } = panels[id].grid;
    const sourceKey = sectionId
      ? `section-${sectionId}`
      : `topLevel-${sectionRows.filter((row) => row < y).length}`;
    const source = panelIdsBySource.get(sourceKey) ?? {
      ids: [],
      dashboardRow: sectionId ? sections[sectionId].grid.y : undefined,
    };
    source.ids.push(id);
    panelIdsBySource.set(sourceKey, source);
  });

  const sources = [...panelIdsBySource.values()].map(({ ids, dashboardRow }) => {
    const minY = Math.min(...ids.map((id) => panels[id].grid.y));
    const maxY = Math.max(...ids.map((id) => panels[id].grid.y + panels[id].grid.h));
    return { ids, minY, height: maxY - minY, dashboardRow: dashboardRow ?? minY };
  });
  sources.sort((sourceA, sourceB) => sourceA.dashboardRow - sourceB.dashboardRow);

  const movedPanels: DashboardLayout['panels'] = {};
  let rowOffset = 0;
  sources.forEach(({ ids, minY, height }) => {
    ids.forEach((id) => {
      const { grid, ...panel } = panels[id];
      movedPanels[id] = {
        ...panel,
        grid: { ...grid, y: grid.y - minY + rowOffset, sectionId: newSection.id },
      };
    });
    rowOffset += height;
  });

  return {
    ...layout,
    panels: { ...panels, ...movedPanels },
    sections: {
      ...sections,
      [newSection.id]: {
        grid: { y: getLayoutBottomRow(layout) },
        title: newSection.title,
        collapsed: false,
      },
    },
  };
};
