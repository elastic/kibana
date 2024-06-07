/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiPanel, transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { useRef, useState } from 'react';
import { useDebouncedWidthObserver } from '../../dashboard_container/component/viewport/dashboard_viewport';
import { resolveGridLayout } from './grid_resolver';
import { GridData, GridLayout } from './types';

export default {
  title: 'POC - html drag drop',
  component: 'Draggable',
  description: 'POC of new grid layout system',
  argTypes: {},
};

export const HtmlDragDrop = () => {
  const [gridLayout, setGridLayout] = useState<GridLayout>({
    panel1: { column: 0, row: 0, width: 12, height: 6, id: 'panel1' },
    panel2: { column: 0, row: 6, width: 8, height: 4, id: 'panel2' },
    panel3: { column: 8, row: 6, width: 12, height: 4, id: 'panel3' },
    panel4: { column: 0, row: 10, width: 48, height: 4, id: 'panel4' },
    panel5: { column: 12, row: 0, width: 36, height: 6, id: 'panel5' },
    panel6: { column: 24, row: 6, width: 24, height: 4, id: 'panel6' },
    panel7: { column: 20, row: 6, width: 4, height: 2, id: 'panel7' },
    panel8: { column: 20, row: 8, width: 4, height: 2, id: 'panel8' },
  });
  const [draggingId, setDraggingId] = useState<string | undefined>();
  const lastDraggedGridLocation = useRef<{ column: number; row: number } | undefined>(undefined);

  const shiftRef = useRef({ x: 0, y: 0 });
  const updateShift = ({ x, y }: { x: number; y: number }) => {
    shiftRef.current = { x, y };
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
      if (!draggingId) return;
      setGridLayout((current) =>
        resolveGridLayout(current, { ...current[draggingId], row, column })
      );
      lastDraggedGridLocation.current = { row, column };
    }
  };

  const gutterSize = 8;
  const rowHeight = 26;
  const rowCount = 30;
  const columnCount = 48;

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

  const gridColor = transparentize(euiThemeVars.euiColorSuccess, 0.2);
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
          ${draggingId ? gridBackgroundStyles : ''}
        `}
      >
        {Object.values(gridLayout).map((gridData) => (
          <DraggableElement
            setDraggingId={setDraggingId}
            key={gridData.id}
            id={gridData.id}
            updateShift={updateShift}
            gridData={gridData}
          />
        ))}
      </div>
    </div>
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
        hasShadow={false}
        hasBorder={true}
        css={css`
          height: 100%;
        `}
      >
        <strong>id:</strong> {gridData.id}{' '}
      </EuiPanel>
    </div>
  );
};
