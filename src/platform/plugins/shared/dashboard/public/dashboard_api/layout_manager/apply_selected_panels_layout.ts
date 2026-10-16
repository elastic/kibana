/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardLayout } from './types';

const GRID_COLUMN_COUNT = 48;

/** Prettify-style grid: 16 cols × 10 rows per panel, 3 per row */
const PRETTIFY_PANEL_WIDTH = 16;
const PRETTIFY_PANEL_HEIGHT = 10;
const PRETTIFY_PANELS_PER_ROW = 3;

/**
 * Sort panel IDs by layout position (top-left first: by y, then by x).
 */
function sortPanelIdsByPosition(
  panelIds: string[],
  panels: DashboardLayout['panels']
): string[] {
  return [...panelIds].sort((a, b) => {
    const ga = panels[a]?.grid ?? { x: 0, y: 0 };
    const gb = panels[b]?.grid ?? { x: 0, y: 0 };
    const ya = ga.y ?? 0;
    const yb = gb.y ?? 0;
    if (ya !== yb) return ya - yb;
    return (ga.x ?? 0) - (gb.x ?? 0);
  });
}

export type SelectedPanelsLayoutMode = 'header' | 'grid' | 'side';

/**
 * Compute a new layout with only the given panel IDs rearranged according to the mode.
 * Only panels present in layout.panels are updated; pinned panels are ignored.
 * All selected panels are placed in the same section (the first panel's sectionId).
 */
export function applySelectedPanelsLayout(
  layout: DashboardLayout,
  selectedPanelIds: ReadonlySet<string>,
  mode: SelectedPanelsLayoutMode
): DashboardLayout {
  const panelIds = sortPanelIdsByPosition(
    [...selectedPanelIds].filter((id) => layout.panels[id]),
    layout.panels
  );
  if (panelIds.length === 0) return layout;

  const firstPanel = layout.panels[panelIds[0]];
  const targetSectionId = firstPanel?.grid?.sectionId;

  const newPanels = { ...layout.panels };

  if (mode === 'header') {
    // One panel on top: 48 cols × 5 rows. Others below: 10 rows each, dividing 48 cols in width.
    const top = panelIds[0];
    newPanels[top] = {
      ...layout.panels[top],
      grid: {
        ...layout.panels[top].grid,
        x: 0,
        y: 0,
        w: GRID_COLUMN_COUNT,
        h: 5,
        sectionId: targetSectionId,
      },
    };
    const rest = panelIds.slice(1);
    const n = rest.length;
    const w = n > 0 ? Math.floor(GRID_COLUMN_COUNT / n) : GRID_COLUMN_COUNT;
    rest.forEach((id, i) => {
      newPanels[id] = {
        ...layout.panels[id],
        grid: {
          ...layout.panels[id].grid,
          x: i * w,
          y: 5,
          w: i === n - 1 ? GRID_COLUMN_COUNT - (n - 1) * w : w,
          h: 10,
          sectionId: targetSectionId,
        },
      };
    });
  } else if (mode === 'grid') {
    // Same as Prettify Dashboard for these panels: 16×10, 3 per row.
    panelIds.forEach((id, index) => {
      const col = index % PRETTIFY_PANELS_PER_ROW;
      const row = Math.floor(index / PRETTIFY_PANELS_PER_ROW);
      newPanels[id] = {
        ...layout.panels[id],
        grid: {
          ...layout.panels[id].grid,
          x: col * PRETTIFY_PANEL_WIDTH,
          y: row * PRETTIFY_PANEL_HEIGHT,
          w: PRETTIFY_PANEL_WIDTH,
          h: PRETTIFY_PANEL_HEIGHT,
          sectionId: targetSectionId,
        },
      };
    });
  } else {
    // mode === 'side': one panel left 24×10, others right 24×5 stacked.
    const left = panelIds[0];
    newPanels[left] = {
      ...layout.panels[left],
      grid: {
        ...layout.panels[left].grid,
        x: 0,
        y: 0,
        w: 24,
        h: 10,
        sectionId: targetSectionId,
      },
    };
    const right = panelIds.slice(1);
    right.forEach((id, i) => {
      newPanels[id] = {
        ...layout.panels[id],
        grid: {
          ...layout.panels[id].grid,
          x: 24,
          y: i * 5,
          w: 24,
          h: 5,
          sectionId: targetSectionId,
        },
      };
    });
  }

  return { ...layout, panels: newPanels };
}
