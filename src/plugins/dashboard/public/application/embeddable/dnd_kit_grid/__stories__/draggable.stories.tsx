/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { DroppableGrid } from '../components/container_components/droppable_grid';

export default {
  title: 'POC - dnd-kit/Draggable',
  component: 'Draggable',
  description: 'POC of new grid layout system',
  argTypes: {},
};

export const BasicSnapToGrid = () => {
  const gridState = {
    ['panel1']: {
      id: 'panel1',
      x: 0,
      y: 0,
      w: 3,
      h: 3,
    },
    ['panel2']: {
      id: 'panel2',
      x: 5,
      y: 5,
      w: 4,
      h: 6,
    },
  };

  return <DroppableGrid id="basicGrid" columns={12} startingState={gridState} />;
};
