/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { cloneDeep, drop, pick } from 'lodash';

import { GridLayoutStateManager, GridRowData } from '../../types';
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
  currentRowOrder.shift(); // drop first row since nothing can go above it
  const updatedRowOrder = Object.keys(gridLayoutStateManager.headerRefs.current).sort(
    (idA, idB) => {
      // if expanded, get dimensions of row; otherwise, use the header
      const rowRefA = currentLayout[idA].isCollapsed
        ? gridLayoutStateManager.headerRefs.current[idA]
        : gridLayoutStateManager.headerRefs.current[idA]; // TODO: this should be calculated from the expanded row height (getRowHeight?)
      const rowRefB = currentLayout[idB].isCollapsed
        ? gridLayoutStateManager.headerRefs.current[idB]
        : gridLayoutStateManager.headerRefs.current[idB]; // TODO: this should be calculated from the expanded row height ()

      if (!rowRefA || !rowRefB) return 0;
      // switch the order when the dragged row goes beyond the mid point of the row it's compared against
      const { top: topA, height: heightA } = rowRefA.getBoundingClientRect();
      const { top: topB, height: heightB } = rowRefB.getBoundingClientRect();
      const midA = topA + heightA / 2;
      const midB = topB + heightB / 2;

      return midA - midB;
    }
  );
  // if dragged row is above the not collapsed row and above some panels, 
  // move these panels to the dragged row - change the row's order, 

//   const draggedRowId = currentActiveRowEvent.id;
//   const draggedRow = currentLayout[draggedRowId];
//   const dropTargetRowId = getDropTargetRowId(currentPointer, gridLayoutStateManager);
//   const panelsToMove = getPanelsIdsToMove(currentPointer, gridLayoutStateManager, dropTargetRowId); 

//   // now we have to calculate new panels positions, remove the panels from the previous row and add it to the one that's dragged

//   if (dropTargetRowId) {

//   const nextLayout = cloneDeep(currentLayout);

//   function partitionObject(obj: GridRowData['panels'], panelIds: string[]) {
//   const picked = {};
//   const omitted = {};
//   const keySet = new Set(panelIds);
//   // console.log(obj, keySet)

//   for (const key in obj) {
//     if (keySet.has(key)) {
//       picked[key] = obj[key];
//     } else {
//       omitted[key] = obj[key];
//     }
//   }

//   return [picked, omitted];
// }
    
// const [pickedPanels, omittedPanels] = partitionObject(currentLayout[dropTargetRowId].panels, panelsToMove);

//   nextLayout[draggedRowId].panels = {...currentLayout[draggedRowId].panels, ...pickedPanels};
//   nextLayout[dropTargetRowId].panels = omittedPanels
//  if (!deepEqual(currentLayout, nextLayout)) {
//   // console.log('nextLayout', nextLayout);
//       gridLayoutStateManager.proposedGridLayout$.next(nextLayout);
//     }
// }



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

const getDropTargetRowId = (
  currentPointer: PointerPosition,
  gridLayoutStateManager: GridLayoutStateManager
) => {

// we want to find a row where headerRef is above the currentPointer and footerRef is below the currentPointer
  const headerRef = Object.entries(gridLayoutStateManager.headerRefs.current).find(([id, ref]) => {
    const footerRef = gridLayoutStateManager.footerRefs.current[id];
    if (!footerRef || !ref) return false;
    const { top } = ref.getBoundingClientRect();
    const { bottom } = footerRef.getBoundingClientRect();
    return top < currentPointer.clientY && bottom > currentPointer.clientY;
  });
  return headerRef ? headerRef[0] : undefined;
}

const getPanelsIdsToMove = (
  currentPointer: PointerPosition, gridLayoutStateManager: GridLayoutStateManager, dropTargetRowId?: string) => {
    if (!dropTargetRowId) return [];

    const hoveredRow = gridLayoutStateManager.gridLayout$.getValue()[dropTargetRowId];
    if (hoveredRow.isCollapsed) return [];

  // panelRefsWithinTheDropTargettedRow that is not collapsed that have bigger top than currentPointer
  const panelRefsWithinTheDropTargettedRow = Object.entries(hoveredRow.panels).filter(
    ([panelId]) => {
      const panelRef = gridLayoutStateManager.panelRefs.current[panelId];
      if (!panelRef) return false;
      const { top } = panelRef.getBoundingClientRect();
      return (
        top > currentPointer.clientY 
        // &&
        // gridLayoutStateManager.gridLayout$.getValue()[panelRef.id].isCollapsed === false ! TODO: this has to be a row and we have to check which one is hovered over
      );
    }
  );
  return panelRefsWithinTheDropTargettedRow.map(([id]) => id);
}