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
import { MutableRefObject } from 'react';

import { GridLayoutStateManager } from '../types';
import { getRowKeysInOrder } from '../utils/resolve_grid_row';
import { getPointerPosition } from './sensors';
import { MousePosition, UserInteractionEvent } from './types';

export const startAction = (
  e: UserInteractionEvent,
  gridLayoutStateManager: GridLayoutStateManager,
  rowId: string,
  startingMouse: MutableRefObject<MousePosition>
) => {
  const headerRef = gridLayoutStateManager.headerRefs.current[rowId];
  if (!headerRef) return;

  const startingPosition = pick(headerRef.getBoundingClientRect(), ['top', 'left']);
  startingMouse.current = getPointerPosition(e);
  gridLayoutStateManager.activeRow$.next({
    id: rowId,
    startingPosition,
    translate: {
      top: 0,
      left: 0,
    },
  });
};

export const commitAction = ({
  activeRow$,
  proposedGridLayout$,
  gridLayout$,
}: GridLayoutStateManager) => {
  activeRow$.next(undefined);
  const proposedGridLayoutValue = proposedGridLayout$.getValue();
  if (proposedGridLayoutValue && !deepEqual(proposedGridLayoutValue, gridLayout$.getValue())) {
    gridLayout$.next(cloneDeep(proposedGridLayoutValue));
  }
  proposedGridLayout$.next(undefined);
};

export const moveAction = (
  gridLayoutStateManager: GridLayoutStateManager,
  rowId: string,
  startingMouse: MousePosition,
  currentMouse: MousePosition
) => {
  const headerRef = gridLayoutStateManager.headerRefs.current[rowId];
  const currentActiveRow = gridLayoutStateManager.activeRow$.getValue();
  if (!headerRef || !currentActiveRow) return;

  const currentLayout =
    gridLayoutStateManager.proposedGridLayout$.getValue() ??
    gridLayoutStateManager.gridLayout$.getValue();
  const currentRowOrder = getRowKeysInOrder(currentLayout);
  currentRowOrder.shift(); // drop first row since nothing can go above it
  const updatedRowOrder = Object.keys(gridLayoutStateManager.headerRefs.current).sort(
    (idA, idB) => {
      // if expanded, get dimensions of row; otherwise, use the header
      const rowRefA = currentLayout[idA].isCollapsed
        ? gridLayoutStateManager.headerRefs.current[idA]
        : gridLayoutStateManager.rowRefs.current[idA];
      const rowRefB = currentLayout[idB].isCollapsed
        ? gridLayoutStateManager.headerRefs.current[idB]
        : gridLayoutStateManager.rowRefs.current[idB];

      if (!rowRefA || !rowRefB) return 0;
      // switch the order when the dragged row goes beyond the mid point of the row it's compared against
      const { top: topA, height: heightA } = rowRefA.getBoundingClientRect();
      const { top: topB, height: heightB } = rowRefB.getBoundingClientRect();
      const midA = topA + heightA / 2;
      const midB = topB + heightB / 2;

      return midA - midB;
    }
  );
  if (!deepEqual(currentRowOrder, updatedRowOrder)) {
    const updatedLayout = cloneDeep(currentLayout);
    updatedRowOrder.forEach((id, index) => {
      updatedLayout[id].order = index + 1;
    });
    gridLayoutStateManager.proposedGridLayout$.next(updatedLayout);
  }

  gridLayoutStateManager.activeRow$.next({
    ...currentActiveRow,
    translate: {
      top: currentMouse.clientY - startingMouse.clientY,
      left: currentMouse.clientX - startingMouse.clientX,
    },
  });
};
