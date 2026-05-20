import type { Dispatch } from 'react';
import React from 'react';
/**
 * Reorder state
 */
export interface ReorderState {
    /**
     * Ids of the elements that are translated up or down
     */
    reorderedItems: Array<{
        id: string;
        height?: number;
    }>;
    /**
     * Direction of the move of dragged element in the reordered list
     */
    direction: '-' | '+';
    /**
     * height of the dragged element
     */
    draggingHeight: number;
    /**
     * indicates that user is in keyboard mode
     */
    isReorderOn: boolean;
}
/**
 * Reorder context state
 */
export type ReorderContextState = [ReorderState, Dispatch<ReorderAction>];
/**
 * Reorder context
 */
export declare const ReorderContext: React.Context<ReorderContextState>;
/**
 * To create a reordering group, surround the elements from the same group with a `ReorderProvider`
 * @param children
 * @param className
 * @param dataTestSubj
 * @constructor
 */
interface ResetAction {
    type: 'reset';
}
interface DragEndAction {
    type: 'dragEnd';
}
interface RegisterDraggingItemHeightAction {
    type: 'registerDraggingItemHeight';
    payload: number;
}
interface RegisterReorderedItemHeightAction {
    type: 'registerReorderedItemHeight';
    payload: {
        id: string;
        height: number;
    };
}
interface SetIsReorderOnAction {
    type: 'setIsReorderOn';
    payload: boolean;
}
interface SetReorderedItemsAction {
    type: 'setReorderedItems';
    payload: {
        items: ReorderState['reorderedItems'];
        draggingIndex: number;
        droppingIndex: number;
    };
}
type ReorderAction = DragEndAction | ResetAction | RegisterDraggingItemHeightAction | RegisterReorderedItemHeightAction | SetIsReorderOnAction | SetReorderedItemsAction;
export declare function ReorderProvider({ children, className, dataTestSubj, }: {
    children: React.ReactNode;
    className?: string;
    dataTestSubj?: string;
}): React.JSX.Element;
export {};
