/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef, useState } from 'react';
import { useDebouncedWidthObserver } from '../../dashboard_container/component/viewport/dashboard_viewport';
import { resolveGrid } from './grid_layout_resolver';
import { pixelCoordinateToGrid } from './grid_layout_utils';
import { KibanaGridRow } from './grid_row';
import { GridLayout, GridSettings, InteractionData, PixelCoordinate } from './types';

export const KibanaGridLayout = ({
  settings,
  gridLayout,
  setGridLayout,
}: {
  settings: GridSettings;
  gridLayout: GridLayout;
  setGridLayout: React.Dispatch<React.SetStateAction<GridLayout>>;
}) => {
  const { gutterSize, columnCount } = settings;
  const [interactionData, setInteractionData] = useState<InteractionData | undefined>();

  // store a pixel shift for the offset between the mouse at the start of a drag, and the panel's top left corner
  const shiftRef = useRef<PixelCoordinate>({ x: 0, y: 0 });
  const updateShift = ({ x, y }: { x: number; y: number }) => (shiftRef.current = { x, y });

  // store the last interaction data to avoid unnecessary re-renders
  // const lastInteractionData = useRef<InteractionData | undefined>(undefined);

  const updateInteractionData = (nextInteractionData?: InteractionData) => {
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
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!interactionData) return;
    const { row, column } = pixelCoordinateToGrid({
      pixel: { x: e.clientX - shiftRef.current.x, y: e.clientY - shiftRef.current.y },
      gridOrigin: { x: gridRef.current?.offsetLeft ?? 0, y: gridRef.current?.offsetTop ?? 0 },
      runtimeSettings,
    });
    const nextInteractionData = { ...interactionData, targetedRow: rowIndex };
    if (nextInteractionData.type === 'drag') {
      nextInteractionData.panelData.row = row;
      nextInteractionData.panelData.column = column;
    } else if (nextInteractionData.type === 'resize') {
      nextInteractionData.panelData.height = Math.max(row - interactionData.panelData.row, 1);
      nextInteractionData.panelData.width = Math.max(column - interactionData.panelData.column, 1);
    }
    updateInteractionData(nextInteractionData);
  };

  // track the width of containing element to calculate column width
  const { width, ref: parentResizeRef } = useDebouncedWidthObserver();
  const columnPixelWidth = (width - gutterSize * (columnCount - 1)) / columnCount;
  const runtimeSettings = { ...settings, columnPixelWidth };

  return (
    <div
      ref={parentResizeRef}
      onDragOver={onDragOver}
      onDragEnd={() => setInteractionData(undefined)}
    >
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
          />
        );
      })}
    </div>
  );
};
