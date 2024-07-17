/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiPortal, transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useResizeObserver from 'use-resize-observer/polyfilled';
import { resolveGrid } from './grid_layout_resolver';
import {
  getClosestGridRowIndex,
  pixelCoordinateToGrid,
  updateDragPreview,
} from './grid_layout_utils';
import { KibanaGridRow } from './grid_row';
import { GridLayout, GridSettings, InteractionData, PixelCoordinate } from './types';

const useDebouncedWidthObserver = (skipDebounce = false, wait = 100) => {
  const [width, setWidth] = useState<number>(0);
  const onWidthChange = useMemo(() => debounce(setWidth, wait), [wait]);
  const { ref } = useResizeObserver<HTMLDivElement>({
    onResize: (dimensions) => {
      if (dimensions.width) {
        if (width === 0 || skipDebounce) setWidth(dimensions.width);
        if (dimensions.width !== width) onWidthChange(dimensions.width);
      }
    },
  });
  return { ref, width };
};

export const KibanaGridLayout = ({
  settings,
  gridLayout,
  setGridLayout,
}: {
  settings: GridSettings;
  gridLayout: GridLayout;
  setGridLayout: React.Dispatch<React.SetStateAction<GridLayout>>;
}) => {
  /**
   * mouse position
   * offset
   * drag vs resize event type
   *
   * requested posistion (x, y, width, height) in pixels
   *   Set preview panel to this position
   * Calculate which grid the preview is over (if drag - if resize, use the targeted grid)
   * requested grid position (row, column, width, height) in grid units + target grid row
   * when requested grid position changes
   *   resolve grid + set grid layout to resolved grid
   */

  const [interactionData, setInteractionData] = useState<InteractionData | undefined>();

  // track the width of containing element to calculate column width
  const { width, ref: parentResizeRef } = useDebouncedWidthObserver();
  const runtimeSettings = useMemo(() => {
    const columnPixelWidth =
      (width - settings.gutterSize * (settings.columnCount - 1)) / settings.columnCount;
    return { ...settings, columnPixelWidth };
  }, [settings, width]);

  // store a ref for each grid row
  const gridRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dragEnterCount = useRef(0);

  // store a pixel shift for the offset between the mouse at the start of a drag, and the panel's top left corner
  const shiftRef = useRef<PixelCoordinate>({ x: 0, y: 0 });
  const updateShift = ({ x, y }: { x: number; y: number }) => (shiftRef.current = { x, y });

  const dragPreview = useRef<HTMLDivElement | null>(null);

  const updateInteractionData = useCallback(
    (nextInteractionData?: InteractionData) => {
      // if (isGridDataEqual(nextInteractionData?.panelData, lastInteractionData.current?.panelData)) {
      //   return;
      // }
      setGridLayout((currentRows) => {
        const interactingId = nextInteractionData?.panelData?.id;
        if (!nextInteractionData || !interactingId) return currentRows;

        // remove the panel from the row it's currently in.
        let originalRow: number | undefined;
        const nextRows = currentRows.map((row, rowIndex) => {
          const { [interactingId]: interactingPanel, ...rest } = row;
          if (interactingPanel) originalRow = rowIndex;
          return { ...rest };
        });

        // resolve destination grid
        const destinationGrid = nextRows[nextInteractionData.targetedRow];
        const resolvedDestinationGrid = resolveGrid(destinationGrid, {
          ...nextInteractionData?.panelData,
        });
        nextRows[nextInteractionData.targetedRow] = resolvedDestinationGrid;

        // resolve origin grid
        if (originalRow && originalRow !== nextInteractionData.targetedRow) {
          const originGrid = nextRows[originalRow];
          const resolvedOriginGrid = resolveGrid(originGrid);
          nextRows[originalRow] = resolvedOriginGrid;
        }

        return nextRows;
      });
      setInteractionData(nextInteractionData);
    },
    [setGridLayout]
  );

  const onDragOver = useCallback(
    (mouseCoordinate: PixelCoordinate) => {
      if (!interactionData) return;
      const mousePoint: PixelCoordinate = {
        x: mouseCoordinate.x - shiftRef.current.x,
        y: mouseCoordinate.y - shiftRef.current.y,
      };
      const rowIndex =
        interactionData.type === 'drag'
          ? getClosestGridRowIndex({
              panelTopLeft: mousePoint,
              gridDivs: gridRefs.current,
            })
          : interactionData.targetedRow;
      const rowDiv = gridRefs.current[rowIndex];
      if (!rowDiv) return;

      const gridOrigin: PixelCoordinate = {
        x: rowDiv.getBoundingClientRect().left,
        y: rowDiv.getBoundingClientRect().top,
      };

      updateDragPreview({
        gridOrigin,
        mousePoint,
        interactionData,
        runtimeSettings,
        dragPreview: dragPreview.current!,
      });

      const { row, column } = pixelCoordinateToGrid({
        panelTopLeft: mousePoint,
        gridOrigin,
        isResize: interactionData.type === 'resize',
        panel: interactionData.panelData,
        runtimeSettings,
      });
      const nextInteractionData = { ...interactionData, targetedRow: rowIndex };
      if (nextInteractionData.type === 'drag') {
        nextInteractionData.panelData.row = row;
        nextInteractionData.panelData.column = column;
      } else if (nextInteractionData.type === 'resize') {
        nextInteractionData.panelData.height = Math.max(row - interactionData.panelData.row, 1);
        nextInteractionData.panelData.width = Math.max(
          column - interactionData.panelData.column,
          1
        );
      }
      updateInteractionData(nextInteractionData);
    },
    [interactionData, runtimeSettings, updateInteractionData]
  );

  useEffect(() => {
    const dragOver = (e: MouseEvent) => {
      if (!interactionData) return;
      e.preventDefault();
      e.stopPropagation();
      const mouseTargetPixel = { x: e.clientX, y: e.clientY };
      onDragOver(mouseTargetPixel);
    };

    const onDrop = (e: MouseEvent) => {
      if (!interactionData) return;
      e.preventDefault();
      e.stopPropagation();

      setInteractionData(undefined);

      dragEnterCount.current = 0;
    };

    const onDragEnter = (e: MouseEvent) => {
      if (!interactionData) return;
      e.preventDefault();
      e.stopPropagation();

      dragEnterCount.current++;
    };

    const onDragLeave = (e: MouseEvent) => {
      if (!interactionData) return;
      e.preventDefault();
      e.stopPropagation();

      dragEnterCount.current--;
      if (dragEnterCount.current === 0) {
        setInteractionData(undefined);
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
  }, [interactionData, onDragOver]);

  return (
    <div ref={parentResizeRef}>
      {gridLayout.map((gridRow, rowIndex) => {
        return (
          <KibanaGridRow
            key={rowIndex}
            gridRow={gridRow}
            rowIndex={rowIndex}
            updateShift={updateShift}
            interactionData={interactionData}
            runtimeSettings={runtimeSettings}
            updateInteractionData={updateInteractionData}
            ref={(el) => (gridRefs.current[rowIndex] = el)}
          />
        );
      })}
      <EuiPortal>
        <div
          ref={dragPreview}
          css={css`
            pointer-events: none;
            border-radius: ${euiThemeVars.euiBorderRadius};
            background-color: ${interactionData
              ? transparentize(euiThemeVars.euiColorSuccess, 0.2)
              : 'transparent'};
            transition: background-color 50ms linear;
            position: absolute;
          `}
        />
      </EuiPortal>
    </div>
  );
};
