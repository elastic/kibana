/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { min } from 'lodash';

interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface Row {
  top: number;
  bottom: number;
  panels: Array<{ id: string; rect: Rect }>;
}

/** Groups panels into visual "rows" via their top coordinates */
const getRows = (panelRects: Record<string, Rect>): Row[] => {
  const sorted = Object.entries(panelRects)
    .map(([id, rect]) => ({ id, rect }))
    .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);

  const rows: Row[] = [];
  sorted.forEach((panel) => {
    const row = rows[rows.length - 1];
    if (row && panel.rect.top < row.bottom) {
      row.panels.push(panel);
      row.bottom = Math.max(row.bottom, panel.rect.bottom);
    } else {
      rows.push({ top: panel.rect.top, bottom: panel.rect.bottom, panels: [panel] });
    }
  });
  rows.forEach((row) => row.panels.sort((a, b) => a.rect.left - b.rect.left));
  return rows;
};

/**
 * Works out the panel order while dragging - vertical position picks the "row" and horizontal position
 * picks the "column"
 */
export const getDragOrder = ({
  activeId,
  previewRect,
  otherPanelRects,
}: {
  activeId: string;
  previewRect: Rect;
  otherPanelRects: Record<string, Rect>;
}): string[] => {
  const rows = getRows(otherPanelRects);
  const centerX = (previewRect.left + previewRect.right) / 2;
  const centerY = (previewRect.top + previewRect.bottom) / 2;

  const getDistance = (row: Row) =>
    centerY < row.top ? row.top - centerY : Math.max(centerY - row.bottom, 0);
  const distances = rows.map(getDistance);
  const targetRow = rows[distances.indexOf(min(distances) ?? -1)];

  const ids = rows.flatMap((row) => {
    const rowIds = row.panels.map(({ id }) => id);
    if (row !== targetRow) return rowIds;

    // insert before the first panel whose center is to the right of the dragged panel's center
    const slot = row.panels.findIndex(({ rect }) => (rect.left + rect.right) / 2 > centerX);
    rowIds.splice(slot === -1 ? rowIds.length : slot, 0, activeId);
    return rowIds;
  });
  if (!targetRow) ids.push(activeId);

  return ids;
};
