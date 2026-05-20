import React, { type FC } from 'react';
import type { DragStart, DropResult } from '@elastic/eui';
interface DroppableWrapperProps {
    /** Content to render inside the droppable zone */
    children: React.ReactNode;
    /** When false, wraps children with drag-drop context; when true, renders as plain div */
    disableDragAndDrop: boolean;
    /** Callback fired when a drag operation starts */
    onDragStart: (start: DragStart) => void;
    /** Callback fired when a drag operation completes with new ordering */
    onDragEnd: (result: DropResult) => void;
}
/**
 * OptionalDroppable - Conditionally provides drag-and-drop context for the tabs
 *
 * When drag-and-drop is disabled, renders children in a plain div with consistent styling.
 * When enabled, wraps children with EuiDragDropContext and EuiDroppable.
 * Used as the parent container for OptionalDraggable items. The droppable context
 * enables reordering of tabs when drag-and-drop is enabled.
 */
export declare const OptionalDroppable: FC<DroppableWrapperProps>;
export {};
