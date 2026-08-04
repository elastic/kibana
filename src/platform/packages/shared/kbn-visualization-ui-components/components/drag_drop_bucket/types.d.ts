import type React from 'react';
import type { DraggableProvided } from '@hello-pangea/dnd';
export interface BucketContainerProps {
    children: React.ReactNode;
    removeTitle: string;
    idx: number;
    onRemoveClick: () => void;
    isDragging?: boolean;
    draggableProvided?: DraggableProvided;
    isInvalid?: boolean;
    invalidMessage?: string;
    isNotRemovable?: boolean;
    isNotDraggable?: boolean;
    'data-test-subj'?: string;
}
