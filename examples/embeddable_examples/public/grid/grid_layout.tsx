/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiPortal, transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { euiThemeVars } from '@kbn/ui-theme';
import { debounce } from 'lodash';
import React, { useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject } from 'rxjs';
import useResizeObserver from 'use-resize-observer/polyfilled';
import { resolveGrid } from './grid_layout_resolver';
import { getScrollAmount, hideDragPreviewRect, isGridDataEqual } from './grid_layout_utils';
import { KibanaGridRow } from './grid_row';
import {
  GridData,
  GridLayout,
  GridSettings,
  PanelInteractionEvent,
  RuntimeGridSettings,
} from './types';

const useKibanaGridLayoutStateManager = ({
  getCreationOptions,
}: {
  getCreationOptions: () => { initialLayout: GridLayout; gridSettings: GridSettings };
}) => {
  const gridLayoutStateManager = useMemo(() => {
    const { initialLayout, gridSettings } = getCreationOptions();
    const gridLayout$ = new BehaviorSubject<GridLayout>(initialLayout);
    const interactionEvent$ = new BehaviorSubject<PanelInteractionEvent | undefined>(undefined);
    const runtimeSettings$ = new BehaviorSubject<RuntimeGridSettings>({
      ...gridSettings,
      columnPixelWidth: 0,
    });

    // debounce width changes to avoid re-rendering too frequently when the browser is resizing
    const onWidthChange = debounce((elementWidth: number) => {
      const columnPixelWidth =
        (elementWidth - gridSettings.gutterSize * (gridSettings.columnCount - 1)) /
        gridSettings.columnCount;
      runtimeSettings$.next({ ...gridSettings, columnPixelWidth });
    }, 250);

    return {
      gridLayout$,
      runtimeSettings$,
      interactionEvent$,
      onWidthChange,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { ref: gridSizeRef } = useResizeObserver<HTMLDivElement>({
    onResize: (dimensions) => {
      if (dimensions.width) {
        gridLayoutStateManager.onWidthChange(dimensions.width);
      }
    },
  });

  return { gridLayoutStateManager, gridSizeRef };
};

export const KibanaGridLayout = ({
  getCreationOptions,
}: {
  getCreationOptions: () => { initialLayout: GridLayout; gridSettings: GridSettings };
}) => {
  const dragEnterCount = useRef(0);
  const rows = useRef<Array<HTMLDivElement | null>>([]);
  const dragPreview = useRef<HTMLDivElement | null>(null);
  const lastRequestedPanelPosition = useRef<GridData | undefined>(undefined);

  const { gridLayoutStateManager, gridSizeRef } = useKibanaGridLayoutStateManager({
    getCreationOptions,
  });

  // -----------------------------------------------------------------------------------------
  // Set up drag events
  // -----------------------------------------------------------------------------------------
  useEffect(() => {
    const { runtimeSettings$, interactionEvent$, gridLayout$ } = gridLayoutStateManager;
    const dragOver = (e: MouseEvent) => {
      const gridRows = rows.current;
      const layout = gridLayout$.value;
      const preview = dragPreview.current;
      const interactionEvent = interactionEvent$.value;
      const isResize = interactionEvent?.type === 'resize';
      const mouseTargetPixel = { x: e.clientX, y: e.clientY };
      const currentGridData = (() => {
        if (!interactionEvent) return;
        for (const row of layout) {
          if (row[interactionEvent.id]) return row[interactionEvent.id];
        }
      })();

      if (
        !runtimeSettings$.value ||
        !interactionEvent ||
        !preview ||
        !gridRows ||
        !currentGridData
      ) {
        return;
      }

      const { scrollLeft, scrollTop } = getScrollAmount();
      e.preventDefault();
      e.stopPropagation();

      // calculate the offset from where the drag started to the edges of the panel.
      const panelRect = interactionEvent.panelDiv.getBoundingClientRect();
      const previewRect = {
        left: isResize
          ? panelRect.left + scrollLeft
          : mouseTargetPixel.x - interactionEvent.mouseOffsets.left + scrollLeft,
        top: isResize
          ? panelRect.top + scrollTop
          : mouseTargetPixel.y - interactionEvent.mouseOffsets.top + scrollTop,
        bottom: mouseTargetPixel.y - interactionEvent.mouseOffsets.bottom + scrollTop,
        right: mouseTargetPixel.x - interactionEvent.mouseOffsets.right + scrollLeft,
      };

      preview.style.opacity = '1';
      preview.style.left = `${previewRect.left}px`;
      preview.style.top = `${previewRect.top}px`;
      preview.style.width = `${Math.max(
        previewRect.right - previewRect.left,
        runtimeSettings$.value.columnPixelWidth
      )}px`;
      preview.style.height = `${Math.max(
        previewRect.bottom - previewRect.top,
        runtimeSettings$.value.rowHeight
      )}px`;

      // find the grid that the preview rect is over
      const lastRowIndex = interactionEvent?.targetRowIndex;
      const targetRowIndex = (() => {
        if (isResize) return lastRowIndex;

        let highestOverlap = -Infinity;
        let highestOverlapRowIndex = -1;
        gridRows.forEach((row, index) => {
          if (!row) return;
          const rowRect = row.getBoundingClientRect();
          const overlap =
            Math.min(previewRect.bottom, rowRect.bottom + scrollTop) -
            Math.max(previewRect.top, rowRect.top + scrollTop);
          if (overlap > highestOverlap) {
            highestOverlap = overlap;
            highestOverlapRowIndex = index;
          }
        });
        return highestOverlapRowIndex;
      })();
      const hasChangedGridRow = targetRowIndex !== lastRowIndex;

      // re-render when the target row changes
      if (hasChangedGridRow) {
        interactionEvent$.next({
          ...interactionEvent,
          targetRowIndex,
        });
      }

      // calculate the requested grid position
      const { columnCount, gutterSize, rowHeight, columnPixelWidth } = runtimeSettings$.value;
      const targetedGridRow = gridRows[targetRowIndex];
      const targetedGridLeft = (targetedGridRow?.getBoundingClientRect().left ?? 0) + scrollLeft;
      const targetedGridTop = (targetedGridRow?.getBoundingClientRect().top ?? 0) + scrollTop;

      const maxColumn = isResize ? columnCount : columnCount - currentGridData.width;

      const localXCoordinate = (isResize ? previewRect.right : previewRect.left) - targetedGridLeft;
      const localYCoordinate = (isResize ? previewRect.bottom : previewRect.top) - targetedGridTop;

      const targetColumn = Math.min(
        Math.max(Math.round(localXCoordinate / (columnPixelWidth + gutterSize)), 0),
        maxColumn
      );
      const targetRow = Math.max(Math.round(localYCoordinate / (rowHeight + gutterSize)), 0);
      const requestedGridData = { ...currentGridData };
      if (isResize) {
        requestedGridData.width = Math.max(targetColumn - requestedGridData.column, 1);
        requestedGridData.height = Math.max(targetRow - requestedGridData.row, 1);
      } else {
        requestedGridData.column = targetColumn;
        requestedGridData.row = targetRow;
      }

      // resolve the new grid layout
      if (
        hasChangedGridRow ||
        !isGridDataEqual(requestedGridData, lastRequestedPanelPosition.current)
      ) {
        lastRequestedPanelPosition.current = { ...requestedGridData };

        // remove the panel from the row it's currently in.
        const nextLayout = layout.map((row, rowIndex) => {
          const { [interactionEvent.id]: interactingPanel, ...rest } = row;
          return { ...rest };
        });

        // resolve destination grid
        const destinationGrid = nextLayout[targetRowIndex];
        const resolvedDestinationGrid = resolveGrid(destinationGrid, requestedGridData);
        nextLayout[targetRowIndex] = resolvedDestinationGrid;

        // resolve origin grid
        if (hasChangedGridRow) {
          const originGrid = nextLayout[lastRowIndex];
          const resolvedOriginGrid = resolveGrid(originGrid);
          nextLayout[lastRowIndex] = resolvedOriginGrid;
        }
        gridLayout$.next(nextLayout);
      }
    };

    const onDrop = (e: MouseEvent) => {
      if (!interactionEvent$.value) return;
      e.preventDefault();
      e.stopPropagation();

      interactionEvent$.next(undefined);
      hideDragPreviewRect(dragPreview.current);
      dragEnterCount.current = 0;
    };

    const onDragEnter = (e: MouseEvent) => {
      if (!interactionEvent$.value) return;
      e.preventDefault();
      e.stopPropagation();

      dragEnterCount.current++;
    };

    const onDragLeave = (e: MouseEvent) => {
      if (!interactionEvent$.value) return;
      e.preventDefault();
      e.stopPropagation();

      dragEnterCount.current--;
      if (dragEnterCount.current === 0) {
        interactionEvent$.next(undefined);
        hideDragPreviewRect(dragPreview.current);
        dragEnterCount.current = 0;
      }
    };

    window.addEventListener('drop', onDrop);
    window.addEventListener('dragover', dragOver);
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    return () => {
      window.removeEventListener('drop', dragOver);
      window.removeEventListener('dragover', dragOver);
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [gridLayout, runtimeSettings, interactionEvent] = useBatchedPublishingSubjects(
    gridLayoutStateManager.gridLayout$,
    gridLayoutStateManager.runtimeSettings$,
    gridLayoutStateManager.interactionEvent$
  );

  return (
    <div ref={gridSizeRef}>
      {gridLayout.map((gridRow, rowIndex) => {
        return (
          <KibanaGridRow
            key={rowIndex}
            gridRow={gridRow}
            rowIndex={rowIndex}
            runtimeSettings={runtimeSettings}
            activePanelId={interactionEvent?.id}
            targetRowIndex={interactionEvent?.targetRowIndex}
            setInteractionEvent={(nextInteractionEvent) => {
              if (!nextInteractionEvent) {
                hideDragPreviewRect(dragPreview.current);
              }
              gridLayoutStateManager.interactionEvent$.next(nextInteractionEvent);
            }}
            ref={(element) => (rows.current[rowIndex] = element)}
          />
        );
      })}
      <EuiPortal>
        <div
          ref={dragPreview}
          css={css`
            pointer-events: none;
            z-index: ${euiThemeVars.euiZModal};
            border-radius: ${euiThemeVars.euiBorderRadius};
            background-color: ${transparentize(euiThemeVars.euiColorSuccess, 0.2)};
            transition: opacity 100ms linear;
            position: absolute;
          `}
        />
      </EuiPortal>
    </div>
  );
};
