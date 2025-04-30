/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  GridLayoutData,
  GridLayoutWidget,
  GridPanelData,
  GridRowData,
  OrderedLayout,
} from '../types';

const collides = (panelA: GridPanelData, panelB: GridPanelData) => {
  if (panelA.id === panelB.id) return false; // same panel
  if (panelA.column + panelA.width <= panelB.column) return false; // panel a is left of panel b
  if (panelA.column >= panelB.column + panelB.width) return false; // panel a is right of panel b
  if (panelA.row + panelA.height <= panelB.row) return false; // panel a is above panel b
  if (panelA.row >= panelB.row + panelB.height) return false; // panel a is below panel b
  return true; // boxes overlap
};

const getAllCollisionsWithPanel = (
  panelToCheck: GridPanelData,
  gridLayout: GridRowData['panels'],
  keysInOrder: string[]
): GridPanelData[] => {
  const collidingPanels: GridPanelData[] = [];
  for (const key of keysInOrder) {
    const comparePanel = gridLayout[key];
    if (comparePanel.id === panelToCheck.id) continue;
    if (collides(panelToCheck, comparePanel)) {
      collidingPanels.push(comparePanel);
    }
  }
  return collidingPanels;
};

const getFirstCollision = (
  gridLayout: GridRowData['panels'],
  keysInOrder: string[]
): string | undefined => {
  for (const panelA of keysInOrder) {
    for (const panelB of keysInOrder) {
      if (panelA === panelB) continue;
      if (collides(gridLayout[panelA], gridLayout[panelB])) {
        return panelA;
      }
    }
  }
  return undefined;
};

export const getMainLayoutInOrder = (
  layout: GridLayoutData,
  draggedId?: string
): Array<{ type: 'panel' | 'section'; id: string }> => {
  const widgetIds = Object.keys(layout);
  const idsInorder = widgetIds.sort((widgetKeyA, widgetKeyB) => {
    const widgetA = layout[widgetKeyA];
    const widgetB = layout[widgetKeyB];

    if (widgetA.type === 'panel' && widgetB.type === 'panel') {
      return comparePanel(widgetA, widgetB, draggedId);
    } else if (widgetA.type !== widgetB.type) {
      if (widgetA.type === 'panel') {
        // widgetB is a section
        const [panel, section] = [widgetA as GridPanelData, widgetB as GridRowData];
        return panel.row - section.row;
      } else {
        // widgetA is a section
        const [panel, section] = [widgetB as GridPanelData, widgetA as GridRowData];
        return section.row - panel.row;
      }
    } else {
      return compareRow(widgetA, widgetB);
    }
  });
  return idsInorder.map((id) => ({ id, type: layout[id].type }));
};

export const getPanelKeysInOrder = (
  panels: GridRowData['panels'],
  draggedId?: string
): string[] => {
  const panelKeys = Object.keys(panels);
  return panelKeys.sort((panelKeyA, panelKeyB) => {
    const panelA = panels[panelKeyA];
    const panelB = panels[panelKeyB];

    return comparePanel(panelA, panelB, draggedId);
  });
};

const compareRow = (widgetA: GridLayoutWidget, widgetB: GridLayoutWidget) => {
  if (widgetA.row > widgetB.row) return 1;
  return -1;
};

const comparePanel = (panelA: GridPanelData, panelB: GridPanelData, draggedId?: string) => {
  // sort by row first
  if (panelA.row > panelB.row) return 1;
  if (panelA.row < panelB.row) return -1;

  // if rows are the same. Is either panel being dragged?
  if (panelA.id === draggedId) return -1;
  if (panelB.id === draggedId) return 1;

  // if rows are the same and neither panel is being dragged, sort by column
  if (panelA.column > panelB.column) return 1;
  if (panelA.column < panelB.column) return -1;

  // fall back
  return 1;
};

const compactGridRow = (originalLayout: GridRowData['panels']) => {
  const nextRowData = { ...originalLayout };
  // compact all vertical space.
  const sortedKeysAfterMove = getPanelKeysInOrder(nextRowData);
  for (const panelKey of sortedKeysAfterMove) {
    const panel = nextRowData[panelKey];
    // try moving panel up one row at a time until it collides
    while (panel.row > 0) {
      const collisions = getAllCollisionsWithPanel(
        { ...panel, row: panel.row - 1 },
        nextRowData,
        sortedKeysAfterMove
      );
      if (collisions.length !== 0) break;
      panel.row -= 1;
    }
  }
  return nextRowData;
};

export const resolveGridRow = (
  originalRowData: GridRowData['panels'],
  dragRequest?: GridPanelData
): GridRowData['panels'] => {
  let nextRowData = { ...originalRowData };
  // apply drag request
  if (dragRequest) {
    nextRowData[dragRequest.id] = dragRequest;
  }
  // get keys in order from top to bottom, left to right, with priority on the dragged item if it exists
  const sortedKeys = getPanelKeysInOrder(nextRowData, dragRequest?.id);

  // while the layout has at least one collision, try to resolve them in order
  let collision = getFirstCollision(nextRowData, sortedKeys);
  while (collision !== undefined) {
    nextRowData = resolvePanelCollisions(nextRowData, nextRowData[collision], sortedKeys);
    collision = getFirstCollision(nextRowData, sortedKeys);
  }
  return compactGridRow(nextRowData); // compact the grid to close any gaps
};

/**
 * for each panel that collides with `panelToResolve`, push the colliding panel down by a single row and
 * recursively handle any collisions that result from that move
 */
function resolvePanelCollisions(
  rowData: GridRowData['panels'],
  panelToResolve: GridPanelData,
  keysInOrder: string[]
): GridRowData['panels'] {
  const collisions = getAllCollisionsWithPanel(panelToResolve, rowData, keysInOrder);
  for (const collision of collisions) {
    if (collision.id === panelToResolve.id) continue;
    rowData[collision.id].row++;
    rowData = resolvePanelCollisions(
      rowData,
      rowData[collision.id],
      /**
       * when recursively resolving any collisions that result from moving this colliding panel down,
       * ignore if `collision` is still colliding with `panelToResolve` to prevent an infinite loop
       */
      keysInOrder.filter((key) => key !== panelToResolve.id)
    );
  }
  return rowData;
}
