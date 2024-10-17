/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject, combineLatest, debounceTime } from 'rxjs';
import useResizeObserver, { type ObservedSize } from 'use-resize-observer/polyfilled';
import {
  GridLayoutData,
  GridLayoutStateManager,
  GridSettings,
  PanelInteractionEvent,
  RuntimeGridSettings,
} from './types';

export const useGridLayoutState = ({
  getCreationOptions,
}: {
  getCreationOptions: () => { initialLayout: GridLayoutData; gridSettings: GridSettings };
}): {
  gridLayoutStateManager: GridLayoutStateManager;
  setDimensionsRef: (instance: HTMLDivElement | null) => void;
} => {
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const panelRefs = useRef<Array<{ [id: string]: HTMLDivElement | null }>>([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { initialLayout, gridSettings } = useMemo(() => getCreationOptions(), []);

  const gridLayoutStateManager = useMemo(() => {
    const gridLayout$ = new BehaviorSubject<GridLayoutData>(initialLayout);
    const gridDimensions$ = new BehaviorSubject<ObservedSize>({ width: 0, height: 0 });
    const interactionEvent$ = new BehaviorSubject<PanelInteractionEvent | undefined>(undefined);
    const draggingPosition$ = new BehaviorSubject<
      | {
          top: number;
          left: number;
          bottom: number;
          right: number;
        }
      | undefined
    >(undefined);
    const runtimeSettings$ = new BehaviorSubject<RuntimeGridSettings>({
      ...gridSettings,
      columnPixelWidth: 0,
    });

    return {
      rowRefs,
      panelRefs,
      gridLayout$,
      dragPreviewRef,
      gridDimensions$,
      runtimeSettings$,
      interactionEvent$,
      draggingPosition$,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    /**
     * debounce width changes to avoid unnecessary column width recalculation.
     */
    const resizeSubscription = gridLayoutStateManager.gridDimensions$
      .pipe(debounceTime(250))
      .subscribe((dimensions) => {
        const elementWidth = dimensions.width ?? 0;
        const columnPixelWidth =
          (elementWidth - gridSettings.gutterSize * (gridSettings.columnCount - 1)) /
          gridSettings.columnCount;
        gridLayoutStateManager.runtimeSettings$.next({ ...gridSettings, columnPixelWidth });
      });

    /**
     * on layout change, update the styles of every panel so that it renders as expected
     */
    const onLayoutChangeSubscription = combineLatest([
      gridLayoutStateManager.gridLayout$,
      gridLayoutStateManager.draggingPosition$,
    ]).subscribe(([gridLayout, draggingPosition]) => {
      const runtimeSettings = gridLayoutStateManager.runtimeSettings$.getValue();
      const currentInteractionEvent = gridLayoutStateManager.interactionEvent$.getValue();

      gridLayout.forEach((currentRow, rowIndex) => {
        Object.keys(currentRow.panels).forEach((key) => {
          const panel = currentRow.panels[key];
          const panelRef = gridLayoutStateManager.panelRefs.current[rowIndex][key];
          if (!panelRef) return;

          const isResize = currentInteractionEvent?.type === 'resize';
          if (panel.id === currentInteractionEvent?.id && draggingPosition) {
            if (isResize) {
              // if the current panel is being resized, ensure it is not shrunk past the size of a single cell
              panelRef.style.width = `${Math.max(
                draggingPosition.right - draggingPosition.left,
                runtimeSettings.columnPixelWidth
              )}px`;
              panelRef.style.height = `${Math.max(
                draggingPosition.bottom - draggingPosition.top,
                runtimeSettings.rowHeight
              )}px`;

              // undo any "lock to grid" styles **except** for the top left corner, which stays locked
              panelRef.style.gridColumnStart = `${panel.column + 1}`;
              panelRef.style.gridRowStart = `${panel.row + 1}`;
              panelRef.style.gridColumnEnd = ``;
              panelRef.style.gridRowEnd = ``;
            } else {
              // if the current panel is being dragged, render it with a fixed position + size
              panelRef.style.position = 'fixed';
              panelRef.style.left = `${draggingPosition.left}px`;
              panelRef.style.top = `${draggingPosition.top}px`;
              panelRef.style.width = `${draggingPosition.right - draggingPosition.left}px`;
              panelRef.style.height = `${draggingPosition.bottom - draggingPosition.top}px`;

              // undo any "lock to grid" styles
              panelRef.style.gridColumnStart = ``;
              panelRef.style.gridRowStart = ``;
              panelRef.style.gridColumnEnd = ``;
              panelRef.style.gridRowEnd = ``;
            }
          } else {
            // if the panel is not being dragged, undo any dragging styles
            panelRef.style.position = '';
            panelRef.style.left = ``;
            panelRef.style.top = ``;
            panelRef.style.width = ``;
            panelRef.style.height = ``;

            // and render the panel locked to the grid
            panelRef.style.gridColumnStart = `${panel.column + 1}`;
            panelRef.style.gridColumnEnd = `${panel.column + 1 + panel.width}`;
            panelRef.style.gridRowStart = `${panel.row + 1}`;
            panelRef.style.gridRowEnd = `${panel.row + 1 + panel.height}`;
          }
        });
      });
    });

    return () => {
      resizeSubscription.unsubscribe();
      onLayoutChangeSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { ref: setDimensionsRef } = useResizeObserver<HTMLDivElement>({
    onResize: (dimensions) => {
      gridLayoutStateManager.gridDimensions$.next(dimensions);
    },
  });

  return { gridLayoutStateManager, setDimensionsRef };
};
