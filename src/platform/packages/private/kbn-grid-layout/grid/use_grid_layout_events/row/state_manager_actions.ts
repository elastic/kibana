/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { cloneDeep, pick } from 'lodash';

import { GridLayoutData, GridLayoutStateManager, GridRowData } from '../../types';
import { getRowKeysInOrder, resolveGridRow } from '../../utils/resolve_grid_row';
import { getSensorType } from '../sensors';
import { PointerPosition, UserInteractionEvent } from '../types';
import { getRowHeight, getRowRect } from '../../utils/calculations';
import { createNewRow } from '../state_manager_selectors';

export const startAction = (
  e: UserInteractionEvent,
  gridLayoutStateManager: GridLayoutStateManager,
  rowId: string
) => {
  const headerRef = gridLayoutStateManager.headerRefs.current[rowId];
  if (!headerRef) return;

  const startingPosition = pick(headerRef.getBoundingClientRect(), ['top', 'left']);
  gridLayoutStateManager.activeRowEvent$.next({
    id: rowId,
    startingPosition,
    sensorType: getSensorType(e),
    translate: {
      top: 0,
      left: 0,
    },
  });
};

export const commitAction = ({
  activeRowEvent$,
  proposedGridLayout$,
  gridLayout$,
}: GridLayoutStateManager) => {
  const proposedGridLayoutValue = proposedGridLayout$.getValue();
  if (proposedGridLayoutValue && !deepEqual(proposedGridLayoutValue, gridLayout$.getValue())) {
    gridLayout$.next(cloneDeep(proposedGridLayoutValue));
  }
  activeRowEvent$.next(undefined);
  proposedGridLayout$.next(undefined);
};

export const cancelAction = ({ activeRowEvent$, proposedGridLayout$ }: GridLayoutStateManager) => {
  activeRowEvent$.next(undefined);
  proposedGridLayout$.next(undefined);
};

const getRowMidPoint = (headerRef: HTMLDivElement | null, rowRef: HTMLDivElement | null) => {
  if (!headerRef) return 0;
  if (!rowRef) {
    const { top, height } = headerRef.getBoundingClientRect();
    return top + height / 2;
  }
  const { top } = headerRef.getBoundingClientRect();
  const { bottom } = rowRef.getBoundingClientRect();
  return top + (bottom - top) / 2;
};

const sortRowsByRefs = (gridLayoutStateManager: GridLayoutStateManager) => {
  return Object.keys(gridLayoutStateManager.headerRefs.current).sort((idA, idB) => {
    // todo: find a smarter way to do this
    // if the row is active, use the header ref to get the mid point since it is the one that is being dragged
    const midPointA = getRowMidPoint(
      gridLayoutStateManager.headerRefs.current[idA],
      gridLayoutStateManager.rowDimensionsRefs.current[idA]
    );
    const midPointB = getRowMidPoint(
      gridLayoutStateManager.headerRefs.current[idB],
      gridLayoutStateManager.rowDimensionsRefs.current[idA]
    );
    return midPointA - midPointB;
  });
};

export const moveAction = (
  gridLayoutStateManager: GridLayoutStateManager,
  startingPointer: PointerPosition,
  currentPointer: PointerPosition
) => {
  const currentActiveRowEvent = gridLayoutStateManager.activeRowEvent$.getValue();
  if (!currentActiveRowEvent) return;

  gridLayoutStateManager.activeRowEvent$.next({
    ...currentActiveRowEvent,
    translate: {
      top: currentPointer.clientY - startingPointer.clientY,
      left: currentPointer.clientX - startingPointer.clientX,
    },
  });

  const currentLayout =
    gridLayoutStateManager.proposedGridLayout$.getValue() ??
    gridLayoutStateManager.gridLayout$.getValue();
  const currentRowOrder = getRowKeysInOrder(currentLayout); // todo - use it in panel move action

  const dropTargetRowId = getDropTarget(currentPointer, gridLayoutStateManager);
  if (!dropTargetRowId) return;

  const dropTargetRow = currentLayout[dropTargetRowId];

  // if the drop target row is collapsible, we only switch order of the rows
  if (dropTargetRow.isCollapsible && currentActiveRowEvent.id !== dropTargetRowId) {
    // console.log('runs?!!>');
    const updatedRowOrder = sortRowsByRefs(gridLayoutStateManager);
    if (!deepEqual(currentRowOrder, updatedRowOrder)) {
      const updatedLayout = cloneDeep(currentLayout);
      updatedRowOrder.forEach((id, index) => {
        updatedLayout[id].order = index + 1;
      });
      gridLayoutStateManager.proposedGridLayout$.next(mergeAdjacentRowsIfNonCollapsible(updatedLayout));
    }
    // if the drop target row is non collapsible, we might need to move panels
  } else if (!dropTargetRow.isCollapsible) {
    const rowPanels = dropTargetRow.panels;
    const rowBelow = currentRowOrder.at(currentRowOrder.indexOf(dropTargetRowId) + 1);

    const panelsBelowCursor = getPanelsBelowCursor(
      currentPointer,
      rowPanels,
      gridLayoutStateManager
    );
    // console.log('rowBelow', rowBelow)
    if (panelsBelowCursor.length && rowBelow && currentLayout[rowBelow].isCollapsible) {
      // create a new row
      const newRow = createNewRow({});
      const { moved, kept } = partitionRowPanels(rowPanels, panelsBelowCursor);
      console.log(moved, kept)

      const updatedLayout = cloneDeep(currentLayout);
      updatedLayout[newRow.id] = {
        ...newRow,
        panels: moved,
      };
      updatedLayout[newRow.id] = resolveGridRow(updatedLayout[newRow.id]);
      updatedLayout[dropTargetRowId] = {
        ...dropTargetRow,
        panels: kept,
      };
      let updatedRowOrder = sortRowsByRefs(gridLayoutStateManager);
      updatedRowOrder = insertAfter(currentRowOrder, currentActiveRowEvent.id, newRow.id);
      if (!deepEqual(currentRowOrder, updatedRowOrder)) {
        updatedRowOrder.forEach((id, index) => {
            updatedLayout[id].order = index + 1;
        });
      }
      gridLayoutStateManager.proposedGridLayout$.next(mergeAdjacentRowsIfNonCollapsible(updatedLayout));
    }

    // GO UP CASE!
    // if all panels from the row are below the cursor AND the row below is not collapsible, move the panels to the below row

    // if some panels from the row are below the cursor AND the row below is not collapsible, move the panels to the below row
    // if none of the panels from the row are below the cursor AND the row below is not collapsible (?)

    // if all panels from the row are below the cursor AND the row below is collapsible, change the order of the rows

    // if some panels from the row are below the cursor AND the row below is collapsible, create a new row and move the panels there
    // GO DOWN CASE!
  }
};

const getPanelsBelowCursor = (
  currentPointer: PointerPosition,
  rowPanels: GridRowData['panels'],
  gridLayoutStateManager: GridLayoutStateManager
) => {
  const panelsBelowCursor = Object.keys(rowPanels).filter((panelId) => {
    const panelRef = gridLayoutStateManager.panelRefs.current[panelId];
    if (!panelRef) return false;
    const { top } = panelRef.getBoundingClientRect();
    return currentPointer.clientY <= top;
  });
  return panelsBelowCursor;
};

function getDropTarget(
  currentPointer: PointerPosition,
  gridLayoutStateManager: GridLayoutStateManager
) {
  const headerRefs = gridLayoutStateManager.headerRefs.current;
  const rowId = Object.keys(headerRefs).find((id) => {
    const ref = headerRefs[id];
    if (!ref) return false;
    const { top, bottom } = getRowRect(id, gridLayoutStateManager);
    return currentPointer.clientY >= top && currentPointer.clientY <= bottom;
  });
  return rowId;
}

function partitionRowPanels(
  obj: GridRowData['panels'],
  keysToKeep: Array<keyof GridRowData['panels']>
): { moved: GridRowData['panels']; kept: GridRowData['panels'] } {
  const moved = {} as GridRowData['panels'];
  const kept = {} as GridRowData['panels'];

  for (const key in obj) {
    if (keysToKeep.includes(key)) {
      moved[key] = obj[key];
    } else {
      kept[key] = obj[key];
    }
  }

  return { moved, kept };
}

function insertAfter(array: string[], target: string, newElement: string): string[] {
  const index = array.indexOf(target);
  if (index === -1) return array; // or throw error if preferred

  return [...array.slice(0, index + 1), newElement, ...array.slice(index + 1)];
}

const mergeAdjacentRowsIfNonCollapsible = (currentLayout: GridLayoutData) => {

  const currentRowOrder = getRowKeysInOrder(currentLayout);
  const updatedLayout = cloneDeep(currentLayout);

  for (let i = 0; i < currentRowOrder.length - 1; i++) {
    const currentRowId = currentRowOrder[i];
    const nextRowId = currentRowOrder[i + 1];

    let currentRow = updatedLayout[currentRowId];
    const nextRow = updatedLayout[nextRowId];

    if (!currentRow.isCollapsible && !nextRow.isCollapsible) {
      // Merge panels from the next row into the current row
      const firstRowHeight = getRowHeight(currentRow);
      Object.entries(nextRow.panels).forEach(([panelId, panel]) => {
        panel.row = firstRowHeight + panel.row;
        nextRow.panels[panelId] = panel;
      })

      currentRow.panels = { ...currentRow.panels, ...nextRow.panels };
      currentRow = resolveGridRow(currentRow);

      // Remove the next row from the layout
      delete updatedLayout[nextRowId];

      // Update the row order
      currentRowOrder.splice(i + 1, 1);

      // Adjust the order property of rows
      currentRowOrder.forEach((id, index) => {
        updatedLayout[id].order = index + 1;
      });

      // Restart the loop to ensure all adjacent rows are checked
      i--;
    }
  }
  return updatedLayout;
};