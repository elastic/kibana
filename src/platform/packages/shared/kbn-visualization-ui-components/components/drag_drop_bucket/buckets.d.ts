import React from 'react';
import type { Assign } from '@kbn/utility-types';
import type { EuiPanelProps } from '@elastic/eui';
import type { BucketContainerProps } from './types';
export declare const DraggableBucketContainer: ({ id, children, isInsidePanel, Container, ...bucketContainerProps }: Assign<Omit<BucketContainerProps, "draggableProvided">, {
    id: string;
    children: React.ReactNode;
    isInsidePanel?: boolean;
    Container?: React.FunctionComponent<BucketContainerProps>;
}>) => React.JSX.Element;
export declare function DragDropBuckets<T = unknown>({ items, onDragStart, onDragEnd, droppableId, children, bgColor, }: {
    items: T[];
    droppableId: string;
    children: React.ReactElement[];
    onDragStart?: () => void;
    onDragEnd?: (items: T[]) => void;
    bgColor?: EuiPanelProps['color'];
}): React.JSX.Element;
