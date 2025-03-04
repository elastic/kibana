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
import { useCallback, useRef } from 'react';
import { GridLayoutStateManager, RowInteractionEvent } from '../types';
import { useGridLayoutContext } from '../use_grid_layout_context';
import { getRowKeysInOrder } from '../utils/resolve_grid_row';
import {
  getPointerPosition,
  isMouseEvent,
  isTouchEvent,
  startMouseInteraction,
  startTouchInteraction,
} from './sensors';
import { UserInteractionEvent } from './types';

export const useGridLayoutRowEvents = ({
  interactionType,
  rowId,
}: {
  interactionType: RowInteractionEvent['type'];
  rowId: string;
}) => {
  const { gridLayoutStateManager } = useGridLayoutContext();

  const pointerPixel = useRef<{ clientX: number; clientY: number }>({ clientX: 0, clientY: 0 });
  const startingMouse = useRef<{ clientX: number; clientY: number }>({ clientX: 0, clientY: 0 });
  const startingPosition = useRef<{ top: number; right: number }>({ top: 0, right: 0 });

  const startInteraction = useCallback(
    (e: UserInteractionEvent) => {
      if (!isLayoutInteractive(gridLayoutStateManager)) return;

      const onStart = () => {
        const headerRef = gridLayoutStateManager.headerRefs.current[rowId];
        if (!headerRef) return;

        const newStartingPosition = headerRef.getBoundingClientRect();
        startingPosition.current = {
          top: newStartingPosition.top,
          right: newStartingPosition.x,
        };
        startingMouse.current = pick(getPointerPosition(e), ['clientX', 'clientY']);

        gridLayoutStateManager.activeRow$.next({
          id: rowId,
          startingPosition: startingPosition.current,
          translate: {
            top: 0,
            left: 0,
          },
        });
      };

      const onMove = (ev: UserInteractionEvent) => {
        if (isMouseEvent(ev) || isTouchEvent(ev)) {
          pointerPixel.current = getPointerPosition(ev);
        }

        const headerRef = gridLayoutStateManager.headerRefs.current[rowId];
        if (!headerRef) return;

        const currentLayout =
          gridLayoutStateManager.proposedGridLayout$.getValue() ??
          gridLayoutStateManager.gridLayout$.getValue();
        const currentRowOrder = getRowKeysInOrder(currentLayout);
        currentRowOrder.shift(); // drop first row since nothing can go above it
        const updatedRowOrder = Object.keys(gridLayoutStateManager.headerRefs.current).sort(
          (idA, idB) => {
            const rowRefA = gridLayoutStateManager.headerRefs.current[idA];
            const rowRefB = gridLayoutStateManager.headerRefs.current[idB];

            const rectA = rowRefA?.getBoundingClientRect();
            const rectB = rowRefB?.getBoundingClientRect();
            return (rectA?.top ?? 0) - (rectB?.top ?? 0);
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
          id: rowId,
          startingPosition: startingPosition.current,
          translate: {
            top: pointerPixel.current.clientY - startingMouse.current.clientY,
            left: pointerPixel.current.clientX - startingMouse.current.clientX,
          },
        });
      };

      const onEnd = () => {
        gridLayoutStateManager.activeRow$.next(undefined);
        const proposedGridLayoutValue = gridLayoutStateManager.proposedGridLayout$.getValue();
        if (
          proposedGridLayoutValue &&
          !deepEqual(proposedGridLayoutValue, gridLayoutStateManager.gridLayout$.getValue())
        ) {
          gridLayoutStateManager.gridLayout$.next(cloneDeep(proposedGridLayoutValue));
        }
        gridLayoutStateManager.proposedGridLayout$.next(undefined);
      };

      if (isMouseEvent(e)) {
        e.stopPropagation();
        startMouseInteraction({
          e,
          onStart,
          onMove,
          onEnd,
        });
      } else if (isTouchEvent(e)) {
        startTouchInteraction({
          e,
          onStart,
          onMove,
          onEnd,
        });
      }
    },
    [gridLayoutStateManager, rowId, interactionType]
  );

  return startInteraction;
};

const isLayoutInteractive = (gridLayoutStateManager: GridLayoutStateManager) => {
  return (
    gridLayoutStateManager.expandedPanelId$.value === undefined &&
    gridLayoutStateManager.accessMode$.getValue() === 'EDIT'
  );
};
