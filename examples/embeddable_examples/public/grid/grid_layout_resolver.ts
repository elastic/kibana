/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GridData, GridRow } from './types';

const collides = (panelA: GridData, panelB: GridData) => {
  if (panelA.id === panelB.id) return false; // same panel
  if (panelA.column + panelA.width <= panelB.column) return false; // panel a is left of panel b
  if (panelA.column >= panelB.column + panelB.width) return false; // panel a is right of panel b
  if (panelA.row + panelA.height <= panelB.row) return false; // panel a is above panel b
  if (panelA.row >= panelB.row + panelB.height) return false; // panel a is below panel b
  return true; // boxes overlap
};

const getAllCollisionsWithPanel = (
  panelToCheck: GridData,
  gridLayout: GridRow,
  keysInOrder: string[]
): GridData[] => {
  const collidingPanels: GridData[] = [];
  for (const key of keysInOrder) {
    const comparePanel = gridLayout[key];
    if (comparePanel.id === panelToCheck.id) continue;
    if (collides(panelToCheck, comparePanel)) {
      collidingPanels.push(comparePanel);
    }
  }
  return collidingPanels;
};

const getKeysInOrder = (gridLayout: GridRow, draggedId?: string): string[] => {
  const keys = Object.keys(gridLayout);
  return keys.sort((panelKeyA, panelKeyB) => {
    const panelA = gridLayout[panelKeyA];
    const panelB = gridLayout[panelKeyB];

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
  });
};

export const resolveGrid = (originalLayout: GridRow, dragRequest?: GridData): GridRow => {
  const gridLayout = { ...originalLayout };

  // Apply drag request
  if (dragRequest) {
    gridLayout[dragRequest.id] = dragRequest;
  }

  // push all panels down if they collide with another panel
  const sortedKeys = getKeysInOrder(gridLayout, dragRequest?.id);

  for (const key of sortedKeys) {
    const panel = gridLayout[key];
    const collisions = getAllCollisionsWithPanel(panel, gridLayout, sortedKeys);

    for (const collision of collisions) {
      const rowOverlap = panel.row + panel.height - collision.row;
      if (rowOverlap > 0) {
        collision.row += rowOverlap;
      }
    }
  }
  const compactedGrid = compactGrid(gridLayout);
  return compactedGrid;
};

export const compactGrid = (originalLayout: GridRow) => {
  const gridLayout = { ...originalLayout };
  // compact all vertical space.
  const sortedKeysAfterMove = getKeysInOrder(gridLayout);
  for (const key of sortedKeysAfterMove) {
    const panel = gridLayout[key];
    // try moving panel up one row at a time until it collides
    while (panel.row > 0) {
      const collisions = getAllCollisionsWithPanel(
        { ...panel, row: panel.row - 1 },
        gridLayout,
        sortedKeysAfterMove
      );
      if (collisions.length !== 0) break;
      panel.row -= 1;
    }
  }
  return gridLayout;
};
