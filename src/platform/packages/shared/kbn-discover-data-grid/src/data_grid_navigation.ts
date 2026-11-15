/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { keys } from '@elastic/eui';

import type { DataGridCellAddress } from './data_grid_api';

interface DataGridNavigationModel {
  readonly rowIds: readonly string[];
  readonly columnIds: readonly string[];
}

export interface DataGridNavigationIntent {
  readonly handled: boolean;
  readonly target?: DataGridCellAddress;
}

export const areDataGridCellAddressesEqual = (
  first: DataGridCellAddress | null,
  second: DataGridCellAddress | null
): boolean => first?.rowId === second?.rowId && first?.columnId === second?.columnId;

export const getFirstDataGridCell = ({
  rowIds,
  columnIds,
}: DataGridNavigationModel): DataGridCellAddress | null => {
  const rowId = rowIds[0];
  const columnId = columnIds[0];
  return rowId !== undefined && columnId !== undefined ? { rowId, columnId } : null;
};

export const getDataGridNavigationIntent = (
  model: DataGridNavigationModel,
  activeCell: DataGridCellAddress,
  key: string,
  isPrimaryModifierPressed: boolean
): DataGridNavigationIntent => {
  const { rowIds, columnIds } = model;
  const rowIndex = rowIds.indexOf(activeCell.rowId);
  const columnIndex = columnIds.indexOf(activeCell.columnId);

  if (rowIndex < 0 || columnIndex < 0) {
    return { handled: false };
  }

  let nextRowIndex = rowIndex;
  let nextColumnIndex = columnIndex;

  switch (key) {
    case keys.ARROW_UP:
      nextRowIndex -= 1;
      break;
    case keys.ARROW_DOWN:
      nextRowIndex += 1;
      break;
    case keys.ARROW_LEFT:
      nextColumnIndex -= 1;
      break;
    case keys.ARROW_RIGHT:
      nextColumnIndex += 1;
      break;
    case keys.HOME:
      if (isPrimaryModifierPressed) {
        nextRowIndex = 0;
      }
      nextColumnIndex = 0;
      break;
    case keys.END:
      if (isPrimaryModifierPressed) {
        nextRowIndex = rowIds.length - 1;
      }
      nextColumnIndex = columnIds.length - 1;
      break;
    default:
      return { handled: false };
  }

  const rowId = rowIds[nextRowIndex];
  const columnId = columnIds[nextColumnIndex];
  if (rowId === undefined || columnId === undefined) {
    return { handled: true };
  }

  return { handled: true, target: { rowId, columnId } };
};

const getNearestSurvivingId = (
  activeId: string,
  previousIds: readonly string[],
  nextIds: readonly string[]
): string | undefined => {
  if (nextIds.includes(activeId)) {
    return activeId;
  }

  const previousIndex = previousIds.indexOf(activeId);
  return nextIds[Math.min(Math.max(previousIndex, 0), nextIds.length - 1)];
};

export const reconcileDataGridActiveCell = (
  activeCell: DataGridCellAddress | null,
  previousModel: DataGridNavigationModel,
  nextModel: DataGridNavigationModel
): DataGridCellAddress | null => {
  if (nextModel.rowIds.length === 0 || nextModel.columnIds.length === 0) {
    return null;
  }

  if (!activeCell) {
    return getFirstDataGridCell(nextModel);
  }

  const rowId = getNearestSurvivingId(activeCell.rowId, previousModel.rowIds, nextModel.rowIds);
  const columnId = getNearestSurvivingId(
    activeCell.columnId,
    previousModel.columnIds,
    nextModel.columnIds
  );

  return rowId !== undefined && columnId !== undefined ? { rowId, columnId } : null;
};
