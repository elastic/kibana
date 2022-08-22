/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React from 'react';
import { ControlFrameProps } from './control_frame_component';
import { SortableControlInner } from './control_group_sortable_control_inner';

export type SortableControlProps = ControlFrameProps & {
  dragInfo: {
    draggingIndex?: number;
    index?: number;
    isDragging?: boolean;
    isOver?: boolean;
  };
  isEditable: boolean;
};

/**
 * A sortable wrapper around the generic control frame.
 */
export const SortableControl = (frameProps: SortableControlProps) => {
  const { embeddableId, isEditable } = frameProps;
  const { attributes, isDragging, isSorting, listeners, over, transform, transition, setNodeRef } =
    useSortable({
      animateLayoutChanges: () => true,
      disabled: !isEditable,
      id: embeddableId,
    });

  frameProps.dragInfo = { ...frameProps.dragInfo, isOver: over?.id === embeddableId, isDragging };

  return (
    <SortableControlInner
      key={embeddableId}
      ref={setNodeRef}
      {...frameProps}
      {...attributes}
      {...listeners}
      style={{
        transition: transition ?? undefined,
        transform: isSorting ? undefined : CSS.Translate.toString(transform),
      }}
    />
  );
};
