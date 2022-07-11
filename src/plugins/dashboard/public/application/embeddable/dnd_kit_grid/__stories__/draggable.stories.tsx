/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { DndContext, DragMoveEvent, DragOverlay } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { css } from '@emotion/react';

import { Draggable } from '../components/container_components/draggable';
import { PanelState } from '../types';

export default {
  title: 'POC - dnd-kit/Draggable',
  component: Draggable,
  description: 'POC of new grid layout system',
  argTypes: {},
};

export const SnapToGrid = () => {
  const [gridState, setGridState] = useState<Record<string, PanelState>>({
    ['panel1']: {
      id: 'panel1',
      pos: { x: 0, y: 0 },
    },
    ['panel2']: {
      id: 'panel2',
      pos: { x: 50, y: 50 },
    },
  });
  const [draggingId, setDraggingId] = useState<string | undefined>(undefined);

  const handleDragStart = (event: DragMoveEvent) => {
    setDraggingId(event.active.id);
  };

  const handleDragEnd = (event: DragMoveEvent) => {
    setDraggingId(undefined);
    setElementPos(event);
  };

  const setElementPos = (event: DragMoveEvent) => {
    const id = event.active.id;
    const newPanelState = gridState[id];

    newPanelState.pos.x = Math.max(newPanelState.pos.x + event.delta.x, 0);
    newPanelState.pos.y = Math.max(newPanelState.pos.y + event.delta.y, 0);

    setGridState({ ...gridState, [id]: newPanelState });
  };

  const guttersize = 0;
  const columns = 12;
  const maxRow = 30;
  const CELL_HEIGHT = 26;

  const gridStyles = useMemo(
    () =>
      css`
        height: 100%;
        width: 100%;
        display: grid;
        gap: ${guttersize}px;
        grid-template-columns: repeat(
          ${columns},
          calc((${100}% - ${guttersize * (columns - 1)}px) / ${columns})
        );
        grid-template-rows: repeat(${maxRow}, ${CELL_HEIGHT}px);
        justify-items: stretch;
      `,
    [guttersize, columns, maxRow]
  );

  return (
    <div id="gridContainer" className="dshGrid dshLayout--editing" css={gridStyles}>
      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToWindowEdges]}
      >
        {Object.keys(gridState).map((id) => (
          <Draggable id={id} position={gridState[id].pos}>
            <div style={{ height: '100%', width: '100%', background: 'pink' }}>test</div>
          </Draggable>
        ))}
        <DragOverlay dropAnimation={null}>
          {draggingId ? (
            <div style={{ height: '100%', width: '100%', background: 'lightblue' }}>test</div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
