import React from 'react';
import type { ReactElement } from 'react';
import type { DragDropIdentifier, DropHandler } from './providers';
import type { DropType } from './types';
import './sass/droppable.scss';
/**
 * The base props to the Droppable component.
 */
export interface DroppableProps {
    /**
     * The CSS class(es) for the root element.
     */
    className?: string;
    /**
     * The event handler that fires when an item
     * is dropped onto this Droppable component.
     */
    onDrop?: DropHandler;
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
     * Additional class names to apply when another element is over the drop target
     */
    getAdditionalClassesOnEnter?: (dropType?: DropType) => string | undefined;
    /**
     * Additional class names to apply when another element is droppable for a currently dragged item
     */
    getAdditionalClassesOnDroppable?: (dropType?: DropType) => string | undefined;
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
     * Indicates the type of drop targets - when undefined, the currently dragged item
     * cannot be dropped onto this component.
     */
    dropTypes?: DropType[];
    /**
     * Order for keyboard dragging. This takes an array of numbers which will be used to order hierarchically
     */
    order: number[];
    /**
     * Extra drop targets by dropType
     */
    getCustomDropTarget?: (dropType: DropType) => ReactElement | null;
}
/**
 * Droppable component
 * @param props
 * @constructor
 */
export declare const Droppable: (props: DroppableProps) => React.JSX.Element;
