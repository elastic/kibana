/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { useDraggable } from '@dnd-kit/core';

export const Draggable = ({ ...props }) => {
  const Element = props.element || 'div';
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.id,
  });

  const style = {
    opacity: isDragging ? '0.5' : '',
  };

  return (
    <Element ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {props.children}
    </Element>
  );
};
