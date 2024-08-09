/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce } from 'lodash';
import { useMemo, useRef } from 'react';
import { BehaviorSubject } from 'rxjs';
import useResizeObserver from 'use-resize-observer/polyfilled';
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
  gridSizeRef: (instance: HTMLDivElement | null) => void;
} => {
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);

  const { gridLayoutStateManager, onWidthChange } = useMemo(() => {
    const { initialLayout, gridSettings } = getCreationOptions();
    const gridLayout$ = new BehaviorSubject<GridLayoutData>(initialLayout);
    const interactionEvent$ = new BehaviorSubject<PanelInteractionEvent | undefined>(undefined);
    const runtimeSettings$ = new BehaviorSubject<RuntimeGridSettings>({
      ...gridSettings,
      columnPixelWidth: 0,
    });

    // debounce width changes to avoid re-rendering too frequently when the browser is resizing
    const widthChange = debounce((elementWidth: number) => {
      const columnPixelWidth =
        (elementWidth - gridSettings.gutterSize * (gridSettings.columnCount - 1)) /
        gridSettings.columnCount;
      runtimeSettings$.next({ ...gridSettings, columnPixelWidth });
    }, 250);

    return {
      gridLayoutStateManager: {
        rowRefs,
        gridLayout$,
        dragPreviewRef,
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
      },
      onWidthChange: widthChange,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { ref: gridSizeRef } = useResizeObserver<HTMLDivElement>({
    onResize: (dimensions) => {
      if (dimensions.width) {
        onWidthChange(dimensions.width);
      }
    },
  });

  return { gridLayoutStateManager, gridSizeRef };
};
