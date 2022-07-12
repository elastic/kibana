/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Resizable } from 're-resizable';
import { DragMoveEvent, useDndMonitor, useDraggable } from '@dnd-kit/core';
import { css } from '@emotion/react';
import { EuiIcon } from '@elastic/eui';
import { PanelState } from '../../types';
interface Props {
  id: string;
  startingPanelState: PanelState;
  element?: React.ElementType | string;
  children?: JSX.Element | JSX.Element[];
}

export const Draggable = ({ id, startingPanelState, element, children }: Props) => {
  useDndMonitor({
    onDragEnd(event) {
      if (event.active.id === id) setElementPos(event);
    },
  });

  const Element = element || 'div';
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
  });
  const columnSize = useRef<number>(50);
  const [panelState, setPanelState] = useState<PanelState>(startingPanelState);

  const updateColumnWidth = () => {
    const gridEl = document.getElementById('gridContainer');
    if (gridEl) {
      const cols = window.getComputedStyle(gridEl).gridTemplateColumns;
      columnSize.current = parseFloat(cols.split('px')[0]);
    }
  };

  const setElementPos = (event: DragMoveEvent) => {
    setPanelState({
      ...panelState,
      pos: {
        x: Math.max(panelState.pos.x + event.delta.x, 0),
        y: Math.max(panelState.pos.y + event.delta.y, 0),
      },
    });
  };

  // this should probably be stored as state as part of the GRID instead of for each panel
  window.addEventListener('resize', () => {
    updateColumnWidth();
  });

  useEffect(() => {
    updateColumnWidth();
  }, []);

  const { columnStart, columnEnd, rowStart, rowEnd } = useMemo(() => {
    // using round instead of ceil so that we wrap **to the closest** right OR left column
    const startC = Math.round(panelState.pos.x / columnSize.current) + 1;
    const startR = Math.round(panelState.pos.y / 26) + 1;

    return {
      columnStart: startC,
      columnEnd: startC + panelState.w,
      rowStart: startR,
      rowEnd: startR + panelState.h,
    };
  }, [panelState]);

  const positionStyles = useMemo(
    () => css`
      grid-column-start: ${columnStart};
      grid-column-end: ${columnEnd};
      grid-row-start: ${rowStart};
      grid-row-end: ${rowEnd};
      opacity: ${isDragging ? '0.5' : ''};
    `,
    [columnStart, columnEnd, rowStart, rowEnd, isDragging]
  );

  return (
    <Element ref={setNodeRef} css={positionStyles}>
      <Resizable
        defaultSize={{ height: '100%', width: '100%' }}
        style={{
          border: 'dashed 1px red',
          background: 'lightyellow',
          padding: '10px',
        }}
        onResizeStop={(e, direction, ref, d) => {
          const pixelWidth = panelState.w * columnSize.current + d.width;
          const pixelHeight = panelState.h * 26 + d.height;

          // had to do this to overwrite the default resize so that I could force snap to the grid
          ref.setAttribute(
            'style',
            'position: relative; user-select: auto; border: 1px dashed red; background: lightyellow; padding: 10px; width: 100%; height: 100%;'
          );
          // ref.updateSize({ width: 200, height: 300 });

          // using round instead of ceil so that we wrap **to the closest** right OR left column
          setPanelState({
            ...panelState,
            w: Math.round(pixelWidth / columnSize.current),
            h: Math.round(pixelHeight / 26),
          });
        }}
      >
        <EuiIcon type="grab" {...listeners} {...attributes} />
        {children}
      </Resizable>
    </Element>
  );
};
