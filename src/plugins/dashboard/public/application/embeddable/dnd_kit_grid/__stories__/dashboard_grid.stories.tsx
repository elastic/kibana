/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
  createSnapModifier,
} from '@dnd-kit/modifiers';

import { Droppable } from '../components/container_components/droppable';
import { Panel } from '../components/presentation_components/panel';
import { Draggable } from '../components/container_components/draggable';

export default {
  title: 'POC - dnd-kit',
  description: 'POC of new grid layout system',
  argTypes: {},
};

export const BasicExample = () => {
  const [isDragging, setIsDragging] = useState(false);

  const gridSize = 20; // pixels
  const snapToGridModifier = createSnapModifier(gridSize);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis, snapToGridModifier]}
    >
      <Draggable id="my-draggable-element">
        <Panel />
      </Draggable>
      {/* <Droppable /> */}
      <DragOverlay modifiers={[restrictToWindowEdges]}>{isDragging ? <Panel /> : null}</DragOverlay>
    </DndContext>
  );
};
