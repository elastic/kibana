/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject, debounceTime } from 'rxjs';
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
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { initialLayout, gridSettings } = useMemo(() => getCreationOptions(), []);

  const gridLayoutStateManager = useMemo(() => {
    const gridLayout$ = new BehaviorSubject<GridLayoutData>(initialLayout);
    const gridDimensions$ = new BehaviorSubject<ObservedSize>({ width: 0, height: 0 });
    const interactionEvent$ = new BehaviorSubject<PanelInteractionEvent | undefined>(undefined);
    const runtimeSettings$ = new BehaviorSubject<RuntimeGridSettings>({
      ...gridSettings,
      columnPixelWidth: 0,
    });

    return {
      rowRefs,
      gridLayout$,
      dragPreviewRef,
      gridDimensions$,
      runtimeSettings$,
      interactionEvent$,
      updatePreviewElement: (previewRect: {
        top: number;
        bottom: number;
        left: number;
        right: number;
      }) => {
        if (!dragPreviewRef.current) return;
        dragPreviewRef.current.style.opacity = '1';
        dragPreviewRef.current.style.left = `${previewRect.left}px`;
        dragPreviewRef.current.style.top = `${previewRect.top}px`;
        dragPreviewRef.current.style.width = `${Math.max(
          previewRect.right - previewRect.left,
          runtimeSettings$.value.columnPixelWidth
        )}px`;
        dragPreviewRef.current.style.height = `${Math.max(
          previewRect.bottom - previewRect.top,
          runtimeSettings$.value.rowHeight
        )}px`;
      },
      hideDragPreview: () => {
        if (!dragPreviewRef.current) return;
        dragPreviewRef.current.style.opacity = '0';
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // debounce width changes to avoid unnecessary column width recalculation.
    const subscription = gridLayoutStateManager.gridDimensions$
      .pipe(debounceTime(250))
      .subscribe((dimensions) => {
        const elementWidth = dimensions.width ?? 0;
        const columnPixelWidth =
          (elementWidth - gridSettings.gutterSize * (gridSettings.columnCount - 1)) /
          gridSettings.columnCount;
        gridLayoutStateManager.runtimeSettings$.next({ ...gridSettings, columnPixelWidth });
      });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { ref: setDimensionsRef } = useResizeObserver<HTMLDivElement>({
    onResize: (dimensions) => {
      gridLayoutStateManager.gridDimensions$.next(dimensions);
    },
  });

  return { gridLayoutStateManager, setDimensionsRef };
};
