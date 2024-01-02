/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo, useRef, useState } from 'react';
import { useDebouncedWidthObserver } from '../../dashboard_container/component/viewport/dashboard_viewport';

export default {
  title: 'POC - html drag drop',
  component: 'Draggable',
  description: 'POC of new grid layout system',
  argTypes: {},
};

type TrackingGridData = GridData & { moved?: boolean };

interface GridLayout {
  [key: string]: GridData;
}

interface GridData {
  id: string;
  column: number;
  row: number;
  width: number;
  height: number;
}

export const HtmlDragDrop = () => {
  const [gridLayout, setGridLayout] = useState<GridLayout>({
    panel1: { column: 0, row: 0, width: 4, height: 4, id: 'panel1' },
    panel2: { column: 4, row: 0, width: 4, height: 2, id: 'panel2' },
  });
  const [draggingId, setDraggingId] = useState<string | undefined>();
  const lastDraggedGridLocation = useRef<{ column: number; row: number } | undefined>(undefined);

  const shiftRef = useRef({ x: 0, y: 0 });
  const updateShift = ({ x, y }: { x: number; y: number }) => {
    shiftRef.current = { x, y };
  };

  const keysInOrder = useMemo(() => {
    const keys = Object.keys(gridLayout);
    return keys.sort((panelKeyA, panelKeyB) => {
      const panelA = gridLayout[panelKeyA];
      const panelB = gridLayout[panelKeyB];
      if (panelA.row > panelB.row || (panelA.row === panelB.row && panelA.column > panelB.column)) {
        return 1;
      }
      return -1;
    });
  }, [gridLayout]);

  const collides = (panelA: GridData, panelB: GridData) => {
    if (panelA.id === panelB.id) return false; // same panel
    if (panelA.column + panelA.width <= panelB.column) return false; // panel a is left of panel b
    if (panelA.column >= panelB.column + panelB.width) return false; // panel a is right of panel b
    if (panelA.row + panelA.height <= panelB.row) return false; // panel a is above panel b
    if (panelA.row >= panelB.row + panelB.height) return false; // panel a is below panel b
    return true; // boxes overlap
  };

  const getAllCollisions = (panelToCheck: GridData): GridData[] => {
    const collidingPanels: GridData[] = [];
    for (const key of keysInOrder) {
      const comparePanel = gridLayout[key];
      if (collides(panelToCheck, comparePanel)) {
        collidingPanels.push(comparePanel);
      }
    }
    return collidingPanels;
  };

  const isColliding = useMemo(() => {
    // temporarily check if panel1 and panel2 collide. This should be replaced with a check for all panels.
    if (!gridLayout.panel1 || !gridLayout.panel2) return false;
    return collides(gridLayout.panel1, gridLayout.panel2);
  }, [gridLayout]);

  // ------------------------------------------------------------------
  // Compact and resolve collisions methods are unused for now.
  // ------------------------------------------------------------------
  const compact = (layout: GridLayout): GridLayout => {
    const compactResult: GridLayout = {};
    for (const key of keysInOrder) {
      const compactedGridData = { ...layout[key] };

      // try to push panel up.
      while (
        compactedGridData.row > 0 &&
        getAllCollisions({ ...compactedGridData, row: compactedGridData.row - 1 }).length === 0
      ) {
        compactedGridData.row--;
      }
      //   compareWith.push(key);
      compactResult[key] = compactedGridData;
    }
    return compactResult;
  };

  const resolveCollisions = (key: string, layout: GridLayout): GridLayout => {
    // for (const key of keysInOrder) {
    const thisPanel = layout[key];
    const collidingPanels = getAllCollisions(layout[key]);
    for (const collision of collidingPanels as TrackingGridData[]) {
      if (collision.moved) continue;

      // calculate amount of overlap
      const columnOverlap = Math.max(
        0,
        Math.min(thisPanel.column + thisPanel.width, collision.column + collision.width) -
          Math.max(thisPanel.column, collision.column)
      );
      const rowOverlap = Math.max(
        0,
        Math.min(thisPanel.row + thisPanel.height, collision.row + collision.height) -
          Math.max(thisPanel.row, collision.row)
      );
      const moveColumn = columnOverlap < rowOverlap;

      if (moveColumn) {
        if (thisPanel.column < collision.column) {
          thisPanel.column -= columnOverlap;
        } else {
          thisPanel.column += columnOverlap;
        }
      } else {
        if (thisPanel.row < collision.row) {
          thisPanel.row -= rowOverlap;
        } else {
          thisPanel.row += rowOverlap;
        }
      }
      resolveCollisions(key, layout);
      //   collision.moved = true;
    }
    // }
    return layout;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggingId) return;
    const { row, column } = pixelLocationToGrid({
      x: e.clientX - shiftRef.current.x,
      y: e.clientY - shiftRef.current.y,
      gridData: gridLayout[draggingId],
    });
    if (
      row !== lastDraggedGridLocation.current?.row ||
      column !== lastDraggedGridLocation.current?.column
    ) {
      setGridLayout((current) => {
        if (!draggingId) return current;
        return {
          ...current,
          [draggingId]: { ...current[draggingId], row, column },
        };
      });
      lastDraggedGridLocation.current = { row, column };
    }
  };

  const gutterSize = 20;
  const rowHeight = 26;
  const rowCount = 10;
  const columnCount = 12;

  const { width, ref: parentResizeRef } = useDebouncedWidthObserver();
  const gridRef = useRef<HTMLDivElement>(null);

  const columnPixelWidth = (width - gutterSize * (columnCount - 1)) / columnCount;

  const pixelLocationToGrid = ({
    x,
    y,
    gridData,
  }: {
    x: number;
    y: number;
    gridData: GridData;
  }) => {
    const localXCoordinate = x - gridRef.current!.getBoundingClientRect().left;
    const localYCoordinate = y - gridRef.current!.getBoundingClientRect().top;

    const maxColumn = columnCount - gridData.width;
    const maxRow = rowCount - gridData.height;

    const column = Math.min(
      Math.max(Math.round(localXCoordinate / (columnPixelWidth + gutterSize)), 0),
      maxColumn
    );
    const row = Math.min(
      Math.max(Math.round(localYCoordinate / (rowHeight + gutterSize)), 0),
      maxRow
    );
    return { column, row };
  };

  const gridBackgroundStyles = css`
    background-position: top -${gutterSize / 2}px left -${gutterSize / 2}px;
    background-size: ${columnPixelWidth + gutterSize}px ${rowHeight + gutterSize}px;
    background-image: linear-gradient(to right, white 2px, transparent 1px),
      linear-gradient(to bottom, white 2px, transparent 1px);
  `;

  return (
    <>
      <div ref={parentResizeRef}>
        <div
          ref={gridRef}
          onDragOver={(e) => handleDragOver(e)}
          onDragEnd={() => {
            setDraggingId(undefined);
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
            background-color: ${isColliding ? '#fcebee' : 'transparent'};

            ${draggingId ? gridBackgroundStyles : ''}
          `}
        >
          <DraggableElement
            setDraggingId={setDraggingId}
            id={'panel1'}
            updateShift={updateShift}
            gridData={gridLayout.panel1}
          />
          <DraggableElement
            setDraggingId={setDraggingId}
            id={'panel2'}
            updateShift={updateShift}
            gridData={gridLayout.panel2}
          />
        </div>
      </div>
    </>
  );
};
const DraggableElement = ({
  id,
  gridData,
  updateShift,
  setDraggingId,
}: {
  id: string;
  gridData: GridData;
  setDraggingId: (id: string | undefined) => void;
  updateShift: (pos: { x: number; y: number }) => void;
}) => {
  const divRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={divRef}
      draggable="true"
      css={css`
        grid-column-start: ${gridData.column + 1};
        grid-column-end: ${gridData.column + 1 + gridData.width};
        grid-row-start: ${gridData.row + 1};
        grid-row-end: ${gridData.row + 1 + gridData.height};
      `}
      onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
        const shiftX = e.clientX - divRef.current!.getBoundingClientRect().left;
        const shiftY = e.clientY - divRef.current!.getBoundingClientRect().top;
        updateShift({ x: shiftX, y: shiftY });
        setDraggingId(id);
      }}
    >
      <EuiPanel
        css={css`
          height: 100%;
        `}
      >
        {gridData.id}
      </EuiPanel>
    </div>
  );
};
