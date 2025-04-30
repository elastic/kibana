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

import {
  GridLayoutData,
  GridLayoutStateManager,
  GridPanelData,
  GridRowData,
  OrderedLayout,
} from '../../types';
import { getRowKeysInOrder, resolveGridRow } from '../../utils/resolve_grid_row';
import { getSensorType } from '../sensors';
import { PointerPosition, UserInteractionEvent } from '../types';
import { getGridLayout, getOrderedLayout } from '../../utils/conversions';
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

export const commitAction = ({ activeRowEvent$ }: GridLayoutStateManager) => {
  activeRowEvent$.next(undefined);
};

export const cancelAction = ({ activeRowEvent$ }: GridLayoutStateManager) => {
  activeRowEvent$.next(undefined);
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
    layoutRef: { current: gridLayoutElement },
    rowRefs: { current: gridRowElements },
    headerRefs: { current: gridHeaderElements },
  } = gridLayoutStateManager;

  // console.log(
  //   'UNDER',
  //   document.elementsFromPoint(currentPointer.clientX - 10, currentPointer.clientY)
  // );

  const currentLayout = gridLayoutStateManager.gridLayout$.getValue();
  const { gutterSize, rowHeight, columnCount } = runtimeSettings;
  const targetedGridTop = gridLayoutElement?.getBoundingClientRect().top ?? 0;
  let localYCoordinate = currentPointer.clientY - targetedGridTop;
  Object.entries(gridRowElements).forEach(([id, row]) => {
    if (!row) return;
    if (!currentLayout[id].isMainSection) {
      const { top, height } = row.getBoundingClientRect();
      if (top <= currentPointer.clientY) {
        const overlap = Math.min(currentPointer.clientY - top, height);
        localYCoordinate -= overlap;
        localYCoordinate += rowHeight + gutterSize;
      }
    }
  });
  const targetRow = Math.max(Math.round(localYCoordinate / (rowHeight + gutterSize)), 0);

  const mainLayout = getGridLayout(currentLayout);
  const mainPanels: GridRowData['panels'] = {};
  Object.values(mainLayout).forEach((widget) => {
    if (widget.type === 'section') {
      mainPanels[widget.id] = {
        id: widget.id,
        row: widget.row,
        column: 0,
        height: 1,
        width: columnCount,
      };
    } else {
      mainPanels[widget.id] = widget;
    }
  }, {} as GridRowData['panels']);

  // console.log({ localYCoordinate, targetRow, mainLayout, mainPanels });

  // treat the dragged row header like a full width, height of 1, panel to resolve
  const resolvedMainGrid = resolveGridRow(mainPanels, {
    id: currentActiveRowEvent.id,
    row: targetRow,
    column: 0,
    height: 1,
    width: columnCount,
  });
  const updatedLayout: GridLayoutData = {};
  Object.keys(resolvedMainGrid).forEach((id) => {
    updatedLayout[id] = {
      ...mainLayout[id],
      row: resolvedMainGrid[id].row,
    };
  });

  gridLayoutStateManager.activeRowEvent$.next({
    ...currentActiveRowEvent,
    translate: {
      top: currentPointer.clientY - startingPointer.clientY,
      left: currentPointer.clientX - startingPointer.clientX,
    },
  });

  if (!isLayoutEqual(mainLayout, updatedLayout)) {
    const orderedLayout = getOrderedLayout(updatedLayout);
    gridLayoutStateManager.gridLayout$.next(orderedLayout);
  }
};
