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
import {
  getMainLayoutInOrder,
  getRowKeysInOrder,
  resolveMainGrid,
} from '../../utils/resolve_grid_row';
import { getSensorType } from '../sensors';
import { PointerPosition, UserInteractionEvent } from '../types';
import { isLayoutEqual } from '../../utils/equality_checks';

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
  activeRowEvent$.next(undefined);
  const proposedGridLayoutValue = proposedGridLayout$.getValue();
  if (proposedGridLayoutValue && !deepEqual(proposedGridLayoutValue, gridLayout$.getValue())) {
    gridLayout$.next(cloneDeep(proposedGridLayoutValue));
  }
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

  const {
    runtimeSettings$: { value: runtimeSettings },
    proposedGridLayout$: { value: proposedGridLayout },
    gridLayout$: { value: gridLayout },
    activeRowEvent$: { value: activeRowEvent },
    layoutRef: { current: gridLayoutElement },
    rowRefs: { current: gridRowElements },
  } = gridLayoutStateManager;
  if (!activeRowEvent) return;

  const { gutterSize, rowHeight } = runtimeSettings;
  const currentLayout = proposedGridLayout ?? gridLayout;
  let nextLayout = cloneDeep(currentLayout);

  const targetedGridTop = gridLayoutElement?.getBoundingClientRect().top ?? 0;
  let localYCoordinate = currentPointer.clientY - targetedGridTop;
  Object.entries(gridRowElements).forEach(([id, row]) => {
    if (!row || (nextLayout[id] as GridRowData).isCollapsed) return;
    const rowRect = row.getBoundingClientRect();
    if (rowRect.y <= currentPointer.clientY) localYCoordinate -= rowRect.height;
  });
  const targetRow = Math.max(Math.round(localYCoordinate / (rowHeight + gutterSize)), 0);
  (nextLayout[activeRowEvent.id] as GridRowData).row = targetRow;
  nextLayout = resolveMainGrid(nextLayout);

  if (!isLayoutEqual(currentLayout, nextLayout)) {
    gridLayoutStateManager.proposedGridLayout$.next(nextLayout);
  }

  gridLayoutStateManager.activeRowEvent$.next({
    ...currentActiveRowEvent,
    translate: {
      top: currentPointer.clientY - startingPointer.clientY,
      left: currentPointer.clientX - startingPointer.clientX,
    },
  });
};
