/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiDraggable } from '@elastic/eui';

import type { TabItem } from '../../types';

export interface OptionalDraggableProps {
  /**
   * Render function that receives drag-related props and returns the draggable element.
   * Uses the render prop pattern to conditionally pass drag props without cloneElement.
   */
  children: (props: { dragHandleProps?: any; isDragging: boolean }) => React.ReactElement;
  /** The tab item being rendered */
  item: TabItem;
  /** Index position in the tabs list, used for drag-drop ordering */
  index: number;
  /** When false, wraps children with EuiDraggable; when true, renders children directly */
  disableDragAndDrop: boolean;
}

/**
 * OptionalDraggable - Conditionally wraps content with drag-and-drop functionality
 *
 * When drag-and-drop is disabled, renders children with isDragging=false.
 * When enabled, wraps children with EuiDraggable and injects drag handle props.
 * Using render prop pattern to make data flow explicit, see React docs:
 * https://react.dev/reference/react/cloneElement#passing-data-with-a-render-prop
 */
export const OptionalDraggable = ({
  children,
  item,
  index,
  disableDragAndDrop,
}: OptionalDraggableProps) => {
  // When drag-and-drop is disabled, render children without drag props
  if (disableDragAndDrop) {
    return children({ isDragging: false });
  }

  // When enabled, wrap with EuiDraggable to provide drag functionality
  return (
    <EuiDraggable
      key={item.id}
      draggableId={item.id}
      index={index}
      usePortal
      hasInteractiveChildren
      customDragHandle="custom"
    >
      {({ dragHandleProps }, { isDragging }) => children({ dragHandleProps, isDragging })}
    </EuiDraggable>
  );
};
