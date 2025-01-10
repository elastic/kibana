/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import type { Assign } from '@kbn/utility-types';
import {
  EuiPanel,
  EuiDraggable,
  EuiDroppable,
  EuiPanelProps,
  EuiDragDropContext,
  DragDropContextProps,
  euiDragDropReorder,
  useEuiTheme,
} from '@elastic/eui';
import { DefaultBucketContainer } from './default_bucket_container';
import type { BucketContainerProps } from './types';

export const DraggableBucketContainer = ({
  id,
  children,
  isInsidePanel,
  Container = DefaultBucketContainer,
  ...bucketContainerProps
}: Assign<
  Omit<BucketContainerProps, 'draggableProvided'>,
  {
    id: string;
    children: React.ReactNode;
    isInsidePanel?: boolean;
    Container?: React.FunctionComponent<BucketContainerProps>;
  }
>) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiDraggable
      draggableId={id}
      customDragHandle={true}
      index={bucketContainerProps.idx}
      isDragDisabled={bucketContainerProps.isNotDraggable}
      style={!isInsidePanel ? { marginBottom: euiTheme.size.xs } : {}}
      spacing="none"
      hasInteractiveChildren
      disableInteractiveElementBlocking
    >
      {(provided, state) => (
        <Container
          draggableProvided={provided}
          isDragging={state?.isDragging ?? false}
          {...bucketContainerProps}
        >
          {children}
        </Container>
      )}
    </EuiDraggable>
  );
};

export function DragDropBuckets<T = unknown>({
  items,
  onDragStart,
  onDragEnd,
  droppableId,
  children,
  bgColor,
}: {
  items: T[];
  droppableId: string;
  children: React.ReactElement[];
  onDragStart?: () => void;
  onDragEnd?: (items: T[]) => void;
  bgColor?: EuiPanelProps['color'];
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd: DragDropContextProps['onDragEnd'] = useCallback(
    ({ source, destination }) => {
      setIsDragging(false);
      if (source && destination) {
        onDragEnd?.(euiDragDropReorder(items, source.index, destination.index));
      }
    },
    [items, onDragEnd]
  );

  const handleDragStart: DragDropContextProps['onDragStart'] = useCallback(() => {
    setIsDragging(true);
    onDragStart?.();
  }, [onDragStart]);

  return (
    <EuiDragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
      <EuiPanel
        paddingSize="none"
        color={isDragging ? 'success' : bgColor}
        hasShadow={false}
        hasBorder={false}
      >
        <EuiDroppable
          droppableId={droppableId}
          spacing={bgColor ? 'm' : 'none'}
          style={{ backgroundColor: 'transparent' }}
        >
          {children}
        </EuiDroppable>
      </EuiPanel>
    </EuiDragDropContext>
  );
}
