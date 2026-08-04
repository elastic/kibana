import React from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import type { DragDropIdentifier } from './providers';
import './sass/draggable.scss';
type DragEvent = React.DragEvent<HTMLElement>;
/**
 * The base props to the Draggable component.
 */
interface DraggableProps {
    /**
     * The CSS class(es) for the root element.
     */
    className?: string;
    /**
     * CSS class to apply when the item is being dragged
     */
    dragClassName?: string;
    /**
     * The event handler that fires when this element is dragged.
     */
    onDragStart?: (target?: DragEvent['currentTarget'] | KeyboardEvent<HTMLButtonElement>['currentTarget']) => void;
    /**
     * The event handler that fires when the dragging of this element ends.
     */
    onDragEnd?: () => void;
    /**
     * The value associated with this item.
     */
    value: DragDropIdentifier;
    /**
     * The React element which will be passed the draggable handlers
     */
    children: ReactElement;
    /**
     * Disable any drag & drop behaviour
     */
    isDisabled?: boolean;
    /**
     * The optional test subject associated with this DOM element.
     */
    dataTestSubj?: string;
    /**
     * items belonging to the same group that can be reordered
     */
    reorderableGroup?: Array<{
        id: string;
    }>;
    /**
     * Indicates to the user whether the currently dragged item
     * will be moved or copied
     */
    dragType: 'copy' | 'move';
    /**
     * Order for keyboard dragging. This takes an array of numbers which will be used to order hierarchically
     */
    order: number[];
}
/**
 * Draggable component
 * @param props
 * @constructor
 */
export declare const Draggable: ({ reorderableGroup, ...props }: DraggableProps) => React.JSX.Element;
export {};
