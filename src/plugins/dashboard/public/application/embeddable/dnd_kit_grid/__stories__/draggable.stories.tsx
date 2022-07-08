/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState } from 'react';
import { DndContext, DragMoveEvent, DragOverlay } from '@dnd-kit/core';
import { createSnapModifier } from '@dnd-kit/modifiers';

import { Draggable } from '../components/container_components/draggable';
import { PanelState } from '../types';
import { StyledGridItem } from '../components/styled_grid_item';

export default {
  title: 'POC - dnd-kit/Draggable',
  component: Draggable,
  description: 'POC of new grid layout system',
  argTypes: {},
};

export const BasicExample = () => {
  const [gridState, setGridState] = useState<Record<string, PanelState>>({
    ['panel1']: {
      id: 'panel1',
      initPos: { x: 0, y: 0 },
      deltaPos: { x: 0, y: 0 },
    },
    ['panel2']: {
      id: 'panel2',
      initPos: { x: 50, y: 50 },
      deltaPos: { x: 50, y: 50 },
    },
  });
  const [draggingId, setDraggingId] = useState<string | undefined>(undefined);

  const gridSize = 30; // pixels
  const snapToGridModifier = createSnapModifier(gridSize);

  const handleDragStart = (event: DragMoveEvent) => {
    setDraggingId(event.active.id);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    setElementPos(event, 'move');
  };

  const handleDragEnd = (event: DragMoveEvent) => {
    console.log('drag end:', event.active.id);
    setDraggingId(undefined);
    setElementPos(event, 'stop');
    console.log('After 2:', gridState[event.active.id]);
  };

  const handleDragCancel = (event: DragMoveEvent) => {
    console.log('drag cancel:', event.active.id);
    setElementPos(event, 'cancel');
  };

  const setElementPos = (event: DragMoveEvent, type: string) => {
    const id = event.active.id;
    const newPanelState = gridState[id];
    if (type === 'move') {
      newPanelState.deltaPos.x = newPanelState.initPos.x + event.delta.x;
      newPanelState.deltaPos.y = newPanelState.initPos.y + event.delta.y;

      // GRID MATH:
      // newPanelState.deltaPos.x =
      //   Math.ceil((newPanelState.initPos.x + event.delta.x) / gridSize) * gridSize;
      // newPanelState.deltaPos.y =
      //   Math.ceil((newPanelState.initPos.y + event.delta.y) / gridSize) * gridSize;
    } else if (type === 'stop') {
      newPanelState.initPos.x += event.delta.x;
      newPanelState.initPos.y += event.delta.y;
    } else if (type === 'cancel') {
      newPanelState.deltaPos = newPanelState.initPos;
    }
    setGridState({ ...gridState, [id]: newPanelState });
  };

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {Object.keys(gridState).map((id) => (
        <Draggable state={gridState[id]}>
          <StyledGridItem
            id={gridState[id].id}
            x={gridState[id].initPos.x}
            y={gridState[id].initPos.y}
            w={3}
            h={3}
            render={() => <p>{JSON.stringify(gridState[id])}</p>}
          />
        </Draggable>
      ))}
      <DragOverlay
        dropAnimation={null}
        style={
          draggingId
            ? {
                transform: `translate(${gridState[draggingId].deltaPos.x}px, ${gridState[draggingId].deltaPos.y}px)`,
              }
            : {}
        }
      >
        {draggingId ? (
          <StyledGridItem
            id={gridState[draggingId].id}
            x={gridState[draggingId].initPos.x}
            y={gridState[draggingId].initPos.y}
            w={3}
            h={3}
            render={() => <p>{JSON.stringify(gridState[draggingId])}</p>}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
