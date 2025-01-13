/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BulkActionsReducerAction, BulkActionsState, BulkActionsVerbs } from '../types';

const getAllRowsInPage = (rowCount: number) =>
  new Map(Array.from(Array(rowCount).keys()).map((idx) => [idx, { isLoading: false }]));

export const bulkActionsReducer = (
  currentState: BulkActionsState,
  { action, rowIndex, rowCount, isLoading = false }: BulkActionsReducerAction
): BulkActionsState => {
  const { rowSelection, rowCount: currentRowCount } = currentState;
  const nextState = { ...currentState };

  if (action === BulkActionsVerbs.add && rowIndex !== undefined) {
    const nextRowSelection = new Map(rowSelection);
    nextRowSelection.set(rowIndex, { isLoading });
    nextState.rowSelection = nextRowSelection;
  } else if (action === BulkActionsVerbs.delete && rowIndex !== undefined) {
    const nextRowSelection = new Map(rowSelection);
    nextRowSelection.delete(rowIndex);
    nextState.rowSelection = nextRowSelection;
  } else if (action === BulkActionsVerbs.selectCurrentPage) {
    nextState.rowSelection = getAllRowsInPage(currentRowCount);
  } else if (action === BulkActionsVerbs.selectAll) {
    nextState.rowSelection = getAllRowsInPage(currentRowCount);
    nextState.isAllSelected = true;
  } else if (action === BulkActionsVerbs.clear) {
    nextState.rowSelection = new Map();
    nextState.isAllSelected = false;
  } else if (action === BulkActionsVerbs.rowCountUpdate && rowCount !== undefined) {
    nextState.rowCount = rowCount;
    nextState.updatedAt = Date.now();
  } else if (action === BulkActionsVerbs.updateAllLoadingState) {
    const nextRowSelection = new Map(
      Array.from(rowSelection.keys()).map((idx: number) => [idx, { isLoading }])
    );
    nextState.rowSelection = nextRowSelection;
  } else if (action === BulkActionsVerbs.updateRowLoadingState && rowIndex !== undefined) {
    nextState.rowSelection.set(rowIndex, { isLoading });
  }

  nextState.areAllVisibleRowsSelected = nextState.rowSelection.size === nextState.rowCount;

  return nextState;
};
