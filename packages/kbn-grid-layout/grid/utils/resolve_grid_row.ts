/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { without } from 'lodash';
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

/**
 * Our collision resolution algorithm works as follows:
 * - Start by creating a 2D grid that contains arrays of panel IDs (i.e. a 3D array)
 *      - If a panel occupies a cell, then its panel ID is pushed into the cell array
 * - Once you have this representation, row by row, resolve the collisions; i.e.
 *      - for each row,
 *           - while there are collisions
 *                - for each colliding panel, in reverse order,
 *                     - move the panel down by a single row
 *                     - if no collisions, break; otherwise, proceed to next panel
 *  Notes:
 *      - We know there is a collision if the panel ID array of a cell contains more than one ID
 *      - Pushing panels down is done in reverse order in order to maintain the original order of panels
 *           - i.e. the bottom-right-most panel is pushed down **first**
 */
export const resolveGridRow = (
  originalRowData: GridRowData,
  columnCount: number,
  dragRequest?: GridPanelData
): GridRowData => {
  const nextRowData = { ...originalRowData, panels: { ...originalRowData.panels } };
  // apply drag request
  if (dragRequest) {
    nextRowData.panels[dragRequest.id] = dragRequest;
  }

  // build an empty 2D array representing the current grid
  const panelRows = Object.values(nextRowData.panels).map(
    ({ row: panelRow, height: panelHeight }) => panelRow + panelHeight
  );
  if (panelRows.length === 0) return nextRowData;
  const rowCount = Math.max(...panelRows);
  const collisionGrid: string[][][] = new Array(rowCount)
    .fill(null)
    .map(() => new Array(columnCount).fill(null).map(() => new Array(0)));

  // for each panel, push its ID into the grid cells that it occupies
  const sortedKeys = getKeysInOrder(nextRowData.panels, dragRequest?.id);
  sortedKeys.forEach((panelKey) => {
    const panel = nextRowData.panels[panelKey];
    for (let row = panel.row; row < panel.row + panel.height; row++) {
      for (let column = panel.column; column < panel.column + panel.width; column++) {
        collisionGrid[row][column].push(panelKey);
      }
    }
  });

  // move panels in reverse order to maintain the original order of panels
  const orderToMove: { [panelKey: string]: number } = sortedKeys
    .reverse()
    .reduce((prev, panelKey, index) => {
      return { ...prev, [panelKey]: index };
    }, {});

  const getCollisionsInOrder = (row: number) => {
    const collisions: string[] = [];
    collisionGrid[row].forEach((collisionArray) => {
      if (collisionArray.length > 1) {
        for (const panelKey of collisionArray) {
          if (collisions.indexOf(panelKey) === -1 && panelKey !== dragRequest?.id) {
            collisions.push(panelKey);
          }
        }
      }
    });
    return collisions.sort((key1, key2) => orderToMove[key1] - orderToMove[key2]);
  };

  // handle all collisions, row by row
  for (let row = dragRequest?.row ?? 0; row < collisionGrid.length; row++) {
    let collisions = getCollisionsInOrder(row);

    // continue pushing panels down until all collisions in this row have been resolved
    while (collisions.length > 0) {
      const panelKey = collisions.shift();
      if (!panelKey) break;

      // move the current colliding panel down
      const panel = nextRowData.panels[panelKey];
      nextRowData.panels[panelKey].row += 1;

      // update the collision grid to keep it in sync
      const currentGridHeight = collisionGrid.length;
      if (row + panel.height >= currentGridHeight) {
        collisionGrid.push(new Array(columnCount).fill(null).map(() => new Array(0)));
      }
      for (
        let panelColumn = panel.column;
        panelColumn < panel.column + panel.width;
        panelColumn++
      ) {
        collisionGrid[panel.row - 1][panelColumn] = without(
          collisionGrid[panel.row - 1][panelColumn],
          panelKey
        );
        collisionGrid[panel.row + panel.height - 1][panelColumn].push(panelKey);
      }

      // re-check if the current row has collisions now that the panel has been moved down
      collisions = getCollisionsInOrder(row);
    }
  }

  const compactedGrid = compactGridRow(nextRowData);
  return compactedGrid;
};
