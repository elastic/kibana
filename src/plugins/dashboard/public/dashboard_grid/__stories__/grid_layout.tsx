/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { useMemo, useRef, useState } from 'react';
import { useDebouncedWidthObserver } from '../../dashboard_container/component/viewport/dashboard_viewport';
import { KibanaGridElement } from './grid_layout_element';
import { resolveGridLayout } from './grid_layout_resolver';
import { GridData, GridLayout, GridSettings } from './types';

export const KibanaGridLayout = ({
  settings,
  gridLayout,
  setGridLayout,
}: {
  settings: GridSettings;
  gridLayout: GridLayout;
  setGridLayout: React.Dispatch<React.SetStateAction<GridLayout>>;
}) => {
  console.log();
  const { gutterSize, columnCount, rowHeight } = settings;
  const [draggingId, setDraggingId] = useState<string | undefined>();
  const [resizingId, setResizingId] = useState<string | undefined>();

  // store the last dragged location to avoid unnecessary re-renders
  const lastDraggedGridLocation = useRef<{ column: number; row: number } | undefined>(undefined);

  // store a pixel shift for the offset between the mouse at the start of a drag, and the panel's top left corner
  const shiftRef = useRef({ x: 0, y: 0 });
  const updateShift = ({ x, y }: { x: number; y: number }) => (shiftRef.current = { x, y });

  // keep a reference to the grid element to calculate the mouse position relative to the grid
  const gridRef = useRef<HTMLDivElement>(null);

  // track the width of containing element to calculate column width
  const { width, ref: parentResizeRef } = useDebouncedWidthObserver();
  const columnPixelWidth = (width - gutterSize * (columnCount - 1)) / columnCount;

  // calculate row count based on the number of rows needed to fit all panels
  const rowCount = useMemo(() => {
    const maxRow = Object.values(gridLayout).reduce((acc, panel) => {
      return Math.max(acc, panel.row + panel.height);
    }, 0);
    if (resizingId) return maxRow + 1;
    return maxRow;
  }, [gridLayout, resizingId]);

  const pixelLocationToGrid = ({
    x,
    y,
    gridData,
  }: {
    x: number;
    y: number;
    gridData: GridData;
  }) => {
    const localXCoordinate = x - shiftRef.current.x - gridRef.current!.getBoundingClientRect().left;
    const localYCoordinate = y - shiftRef.current.y - gridRef.current!.getBoundingClientRect().top;

    const maxColumn = draggingId ? columnCount - gridData.width : columnCount;

    const column = Math.min(
      Math.max(Math.round(localXCoordinate / (columnPixelWidth + gutterSize)), 0),
      maxColumn
    );
    const row = Math.max(Math.round(localYCoordinate / (rowHeight + gutterSize)), 0);

    return { column, row };
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggingId && !resizingId) return;
    const id = (draggingId ?? resizingId) as string;
    const { row, column } = pixelLocationToGrid({
      x: e.clientX,
      y: e.clientY,
      gridData: gridLayout[id],
    });
    if (
      row !== lastDraggedGridLocation.current?.row ||
      column !== lastDraggedGridLocation.current?.column
    ) {
      setGridLayout((current) => {
        const dragRequest = current[id];
        if (draggingId) {
          dragRequest.row = row;
          dragRequest.column = column;
        } else if (resizingId) {
          dragRequest.height = Math.max(row - dragRequest.row, 1);
          dragRequest.width = Math.max(column - dragRequest.column, 1);
        }
        return resolveGridLayout(current, { ...dragRequest });
      });
      lastDraggedGridLocation.current = { row, column };
    }
  };

  const gridColor = transparentize(euiThemeVars.euiColorSuccess, 0.1);
  const gridBackgroundStyles = css`
    background-position: top -${gutterSize / 2}px left -${gutterSize / 2}px;
    background-size: ${columnPixelWidth + gutterSize}px ${rowHeight + gutterSize}px;
    background-image: linear-gradient(to right, ${gridColor} 1px, transparent 1px),
      linear-gradient(to bottom, ${gridColor} 1px, transparent 1px);
  `;

  return (
    <div ref={parentResizeRef}>
      <div
        ref={gridRef}
        onDragOver={(e) => handleDragOver(e)}
        onDragEnd={() => {
          setDraggingId(undefined);
          setResizingId(undefined);
          lastDraggedGridLocation.current = undefined;
        }}
        css={css`
          height: 100%;
          width: 100%;
          display: grid;
          gap: ${gutterSize}px;
          grid-template-columns: repeat(
            ${columnCount},
            calc((100% - ${gutterSize * (columnCount - 1)}px) / ${columnCount})
          );
          grid-template-rows: repeat(${rowCount}, ${rowHeight}px);
          justify-items: stretch;
          ${(draggingId || resizingId) && gridBackgroundStyles}
        `}
      >
        {Object.values(gridLayout).map((gridData) => (
          <KibanaGridElement
            isBeingDragged={draggingId === gridData.id || resizingId === gridData.id}
            setResizingId={setResizingId}
            setDraggingId={setDraggingId}
            updateShift={updateShift}
            gridData={gridData}
            key={gridData.id}
            id={gridData.id}
          />
        ))}
      </div>
    </div>
  );
};
