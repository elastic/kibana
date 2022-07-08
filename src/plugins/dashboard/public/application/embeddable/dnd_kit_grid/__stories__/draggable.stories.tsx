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

import { Panel } from '../components/presentation_components/panel';
import { Draggable } from '../components/container_components/draggable';
import { PanelState } from '../types';

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
    } else if (type === 'stop') {
      newPanelState.initPos.x += event.delta.x;
      newPanelState.initPos.y += event.delta.y;
    } else if (type === 'cancel') {
      newPanelState.deltaPos = newPanelState.initPos;
    }
    setGridState({ ...gridState, id: newPanelState });
  };

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Draggable state={gridState.panel1}>
        <Panel state={gridState.panel1} />
      </Draggable>
      <Draggable state={gridState.panel2}>
        <Panel state={gridState.panel2} />
      </Draggable>

      {/* {Object.keys(gridState).map((id) => (
        <Draggable state={gridState[id]}>
          <Panel state={gridState[id]} />
        </Draggable>
      ))}
      {/* <Droppable /> */}
      <DragOverlay
        dropAnimation={null}
        style={
          draggingId
            ? {
                transform: `translate3d(${gridState[draggingId].deltaPos.x}px, ${gridState[draggingId].deltaPos.y}px, 0)`,
              }
            : {}
        }
      >
        {draggingId ? <Panel state={gridState[draggingId]} /> : null}
      </DragOverlay>
    </DndContext>
  );
};
