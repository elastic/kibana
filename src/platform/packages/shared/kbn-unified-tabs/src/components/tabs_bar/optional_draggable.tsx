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
  children: (props: { dragHandleProps?: any; isDragging: boolean }) => React.ReactElement;
  item: TabItem;
  index: number;
  enableDragAndDrop: boolean;
}

export const OptionalDraggable = ({
  children,
  item,
  index,
  enableDragAndDrop,
}: OptionalDraggableProps) => {
  if (!enableDragAndDrop) {
    return children({ isDragging: false });
  }

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
