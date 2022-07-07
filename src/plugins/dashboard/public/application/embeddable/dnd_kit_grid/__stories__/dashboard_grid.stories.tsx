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

import { Panel } from '../components/presentation_components/panel';
import { Draggable } from '../components/container_components/draggable';
import { Grid } from '../components/grid';
import {
  largeGridData,
  mediumGridData,
  smallGridData,
} from '../../gridstack_grid/__stories__/fixtures';
import { logsDashboardGridData } from '../../gridstack_grid/constants';

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

export const Columns48Example = () => <Grid gridData={largeGridData} />;
export const Columns24Example = () => <Grid columns={24} gridData={mediumGridData} />;
export const Columns12Example = () => <Grid columns={12} gridData={smallGridData} />;
export const LogsDashboardExample = () => <Grid gridData={logsDashboardGridData} />;
