/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GridPanelData, GridRowData } from '../types';

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
  gridLayout: GridRowData,
  keysInOrder: string[]
): GridPanelData[] => {
  const collidingPanels: GridPanelData[] = [];
  for (const key of keysInOrder) {
    const comparePanel = gridLayout.panels[key];
    if (comparePanel.id === panelToCheck.id) continue;
    if (collides(panelToCheck, comparePanel)) {
      collidingPanels.push(comparePanel);
    }
  }
  return collidingPanels;
};

export const getKeysInOrder = (panels: GridRowData['panels'], draggedId?: string): string[] => {
  const panelKeys = Object.keys(panels);
  return panelKeys.sort((panelKeyA, panelKeyB) => {
    const panelA = panels[panelKeyA];
    const panelB = panels[panelKeyB];

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

const compactGridRow = (originalLayout: GridRowData) => {
  const nextRowData = { ...originalLayout, panels: { ...originalLayout.panels } };
  // compact all vertical space.
  const sortedKeysAfterMove = getKeysInOrder(nextRowData.panels);
  for (const panelKey of sortedKeysAfterMove) {
    const panel = nextRowData.panels[panelKey];
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
  originalRowData: GridRowData,
  dragRequest?: GridPanelData
): GridRowData => {
  const nextRowData = { ...originalRowData, panels: { ...originalRowData.panels } };

  // Apply drag request
  if (dragRequest) {
    nextRowData.panels[dragRequest.id] = dragRequest;
  }
  // return nextRowData;

  // push all panels down if they collide with another panel
  const sortedKeys = getKeysInOrder(nextRowData.panels, dragRequest?.id);

  for (const key of sortedKeys) {
    const panel = nextRowData.panels[key];
    const collisions = getAllCollisionsWithPanel(panel, nextRowData, sortedKeys);

    for (const collision of collisions) {
      const rowOverlap = panel.row + panel.height - collision.row;
      if (rowOverlap > 0) {
        collision.row += rowOverlap;
      }
    }
  }
  const compactedGrid = compactGridRow(nextRowData);
  return compactedGrid;
};
