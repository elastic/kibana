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

import { GridLayoutStateManager } from '../../types';
import { getRowKeysInOrder } from '../../utils/resolve_grid_row';
import { getSensorType } from '../sensors';
import { PointerPosition, UserInteractionEvent } from '../types';

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

const isActiveRow = (id: string, activeRowId: string) => {
  return id === activeRowId;
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

export const moveAction = (
  gridLayoutStateManager: GridLayoutStateManager,
  startingPointer: PointerPosition,
  currentPointer: PointerPosition
) => {
  const currentActiveRowEvent = gridLayoutStateManager.activeRowEvent$.getValue();
  if (!currentActiveRowEvent) return;

  const currentLayout =
    gridLayoutStateManager.proposedGridLayout$.getValue() ??
    gridLayoutStateManager.gridLayout$.getValue();
  const currentRowOrder = getRowKeysInOrder(currentLayout);

  const dropTargetRowId = getDropTarget(currentPointer, gridLayoutStateManager);
  console.log('dropTargetRowId', dropTargetRowId);

  let updatedRowOrder = currentRowOrder;

  if (dropTargetRowId && currentLayout[dropTargetRowId].isCollapsible) {
    updatedRowOrder = Object.keys(gridLayoutStateManager.headerRefs.current)
      .sort((idA, idB) => {
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
      })
  }

  if (!deepEqual(currentRowOrder, updatedRowOrder)) {
    const updatedLayout = cloneDeep(currentLayout);
    updatedRowOrder.forEach((id, index) => {
      updatedLayout[id].order = index + 1;
    });
    gridLayoutStateManager.proposedGridLayout$.next(updatedLayout);
  }

  gridLayoutStateManager.activeRowEvent$.next({
    ...currentActiveRowEvent,
    translate: {
      top: currentPointer.clientY - startingPointer.clientY,
      left: currentPointer.clientX - startingPointer.clientX,
    },
  });
};

function getDropTarget(
  currentPointer: PointerPosition,
  gridLayoutStateManager: GridLayoutStateManager
) {
  const headerRefs = gridLayoutStateManager.headerRefs.current;
  const rowId =  Object.keys(headerRefs).find((id) => {
    const ref = headerRefs[id];
    if (!ref) return false;
    const { top, bottom } = ref.getBoundingClientRect();
    return currentPointer.clientY >= top && currentPointer.clientY <= bottom;
  });
  return rowId;
}

const getRowRect = (
  rowId: string, 
  gridLayoutStateManager: GridLayoutStateManager
) => {
  const headerRef = gridLayoutStateManager.headerRefs.current[rowId];
  const rowRef = gridLayoutStateManager.rowDimensionsRefs.current[rowId];
  if (!headerRef) return null;
  if (!rowRef) {
    const { top, bottom } = headerRef.getBoundingClientRect();
    return {
      top,
      bottom,
    };
  };
  const top = headerRef.getBoundingClientRect().top;
  const bottom = rowRef.getBoundingClientRect().bottom;
  return {
    top,
    bottom,
  };
}
