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

import { GridLayoutStateManager, GridRowData } from '../../types';
import { getRowKeysInOrder } from '../../utils/resolve_grid_row';
import { getSensorType } from '../sensors';
import { PointerPosition, UserInteractionEvent } from '../types';
import { getRowRect } from '../../utils/calculations';

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
  const currentRowOrder = getRowKeysInOrder(currentLayout);

  const dropTargetRowId = getDropTarget(currentPointer, gridLayoutStateManager);
  if (!dropTargetRowId) return;

  const dropTargetRow = currentLayout[dropTargetRowId];

  // if the drop target row is collapsible, we only switch order of the rows
  if (dropTargetRow.isCollapsible) {
    const updatedRowOrder = sortRowsByRefs(gridLayoutStateManager);
    if (!deepEqual(currentRowOrder, updatedRowOrder)) {
      const updatedLayout = cloneDeep(currentLayout);
      updatedRowOrder.forEach((id, index) => {
        updatedLayout[id].order = index + 1;
      });
      gridLayoutStateManager.proposedGridLayout$.next(updatedLayout);
    }
    // if the drop target row is non collapsible, we might need to move panels
  } else if (!dropTargetRow.isCollapsible) {
    const rowPanels = dropTargetRow.panels;
    const panelsBelowCursor = getPanelsBelowCursor(
      currentPointer,
      rowPanels,
      gridLayoutStateManager
    )
    console.log('panelsBelowCursor', panelsBelowCursor);
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
): { kept: GridRowData['panels']; omitted: GridRowData['panels'] } {
  const kept = {} as GridRowData['panels'];
  const omitted = {} as GridRowData['panels'];

  for (const key in obj) {
    if (keysToKeep.includes(key)) {
      kept[key] = obj[key];
    } else {
      omitted[key] = obj[key];
    }
  }

  return { kept, omitted };
}

function insertAfter(array: string[], target: string, newElement: string): string[] {
  const index = array.indexOf(target);
  if (index === -1) return array; // or throw error if preferred

  return [...array.slice(0, index + 1), newElement, ...array.slice(index + 1)];
}
