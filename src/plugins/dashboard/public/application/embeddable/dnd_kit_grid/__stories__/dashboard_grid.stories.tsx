/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { DndContext } from '@dnd-kit/core';

import { Draggable } from '../components/draggable';
import { Droppable } from '../components/droppable';

export default {
  title: 'POC - dnd-kit',
  description: 'POC of new grid layout system',
  argTypes: {},
};

export const BasicExample = () => {
  return (
    <DndContext>
      <Draggable />
      <Droppable />
    </DndContext>
  );
};
