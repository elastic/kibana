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
// import { GridStackNode } from 'gridstack/dist/types';

interface Props {
  id: string;
  startingPanelState: PanelState;
  updatePanel: (itemId: string, partialItem: Partial<PanelState>) => void;
  element?: React.ElementType | string;
  children?: JSX.Element | JSX.Element[];
}

export const Draggable = ({ id, startingPanelState, updatePanel, element, children }: Props) => {
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
    const pixelX = panelState.x * columnSize.current + event.delta.x;
    const pixelY = panelState.y * 26 + event.delta.y;

    const column = Math.max(Math.round(pixelX / columnSize.current), 0);
    const row = Math.max(Math.round(pixelY / 26), 0);

    const newPanelState = {
      ...panelState,
      x: column,
      y: row,
    };
    console.log('Set element position:', newPanelState);
    setPanelState(newPanelState);
    updatePanel(id, newPanelState);
  };

  const setElementSize = (ref: HTMLDivElement, delta: { width: number; height: number }) => {
    const pixelWidth = panelState.w * columnSize.current + delta.width;
    const pixelHeight = panelState.h * 26 + delta.height;

    // had to do this to overwrite the default resize so that I could force snap to the grid
    ref.setAttribute(
      'style',
      'position: relative; user-select: auto; border: 1px dashed red; background: lightyellow; padding: 10px; width: 100%; height: 100%;'
    );

    // using round instead of ceil so that we wrap **to the closest** right OR left column
    const newPanelState = {
      ...panelState,
      w: Math.round(pixelWidth / columnSize.current),
      h: Math.round(pixelHeight / 26),
    };
    console.log('Set element size:', newPanelState);
    setPanelState(newPanelState);
    updatePanel(id, newPanelState);
  };

  // this should probably be stored as state as part of the GRID instead of for each panel
  window.addEventListener('resize', () => {
    updateColumnWidth();
  });

  useEffect(() => {
    updateColumnWidth();
  }, []);

  const positionStyles = useMemo(() => {
    return css`
      grid-column-start: ${panelState.x + 1};
      grid-column-end: ${panelState.x + 1 + panelState.w};
      grid-row-start: ${panelState.y + 1};
      grid-row-end: ${panelState.y + 1 + panelState.h};
      opacity: ${isDragging ? '0.5' : ''};
    `;
  }, [panelState, isDragging]);

  return (
    <Element ref={setNodeRef} css={positionStyles}>
      <Resizable
        defaultSize={{ height: '100%', width: '100%' }}
        style={{
          border: 'dashed 1px red',
          background: 'lightyellow',
          padding: '10px',
        }}
        enable={{
          bottom: true,
          bottomRight: true,
          right: true,
        }}
        onResizeStop={(e, direction, ref, d) => {
          setElementSize(ref, d);
        }}
      >
        <EuiIcon type="grab" {...listeners} {...attributes} />
        {children}
      </Resizable>
    </Element>
  );
};
