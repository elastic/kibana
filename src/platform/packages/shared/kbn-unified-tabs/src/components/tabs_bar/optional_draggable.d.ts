import React from 'react';
import type { TabItem } from '../../types';
export interface OptionalDraggableProps {
    /**
     * Render function that receives drag-related props and returns the draggable element.
     * Uses the render prop pattern to conditionally pass drag props without cloneElement.
     */
    children: (props: {
        dragHandleProps?: any;
        isDragging: boolean;
    }) => React.ReactElement;
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
export declare const OptionalDraggable: ({ children, item, index, disableDragAndDrop, }: OptionalDraggableProps) => React.JSX.Element;
