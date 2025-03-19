/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { cloneDeep } from 'lodash';

import { GridLayoutData } from '../types';
import { resolveGridRow } from './resolve_grid_row';

/**
 * Move the panels in the `startingRow` to the bottom of the `newRow` and resolve the resulting layout
 * @param layout Starting layout
 * @param startingRow The source row for the panels
 * @param newRow The destination row for the panels
 * @returns Updated layout with panels moved from `startingRow` to `newRow`
 */
export const movePanelsToRow = (layout: GridLayoutData, startingRow: string, newRow: string) => {
  const newLayout = cloneDeep(layout);
  const panelsToMove = newLayout[startingRow].panels;
  const startingPanels = Object.values(newLayout[newRow].panels);
  const maxRow =
    startingPanels.length > 0
      ? Math.max(...startingPanels.map(({ row, height }) => row + height))
      : 0;
  Object.keys(panelsToMove).forEach((index) => (panelsToMove[index].row += maxRow));
  newLayout[newRow].panels = { ...newLayout[newRow].panels, ...panelsToMove };
  newLayout[newRow] = resolveGridRow(newLayout[newRow]);
  newLayout[startingRow] = { ...newLayout[startingRow], panels: {} };
  return newLayout;
};

/**
 * Deletes an entire row from the layout, including all of its panels
 * @param layout Starting layout
 * @param rowIndex The row to be deleted
 * @returns Updated layout with the row at `rowIndex` deleted
 */
export const deleteRow = (layout: GridLayoutData, rowId: string) => {
  const newLayout = cloneDeep(layout);
  delete newLayout[rowId];
  return newLayout;
};
