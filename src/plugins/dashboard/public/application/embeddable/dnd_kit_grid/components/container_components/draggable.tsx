/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { PanelState } from '../../types';
interface Props {
  state: PanelState;
  element?: React.ElementType | string;
  children?: JSX.Element | JSX.Element[];
}

export const Draggable = ({ state, element, children }: Props) => {
  const Element = element || 'div';
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: state.id,
  });

  const transform = {
    transform: `translate(${state.initPos.x}px, ${state.initPos.y}px)`,
  };

  const style = {
    opacity: isDragging ? '0.5' : '',
    ...transform,
  };

  return (
    <Element ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </Element>
  );
};
