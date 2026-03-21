import React from 'react';
import type { DropIdentifier, DragDropIdentifier, RegisteredDropTargets, DragContextValue, DragContextState, CustomMiddleware, DraggingIdentifier } from './types';
export declare function useDragDropContext(): DragContextValue;
/**
 * The argument to DragDropProvider.
 */
export interface ProviderProps {
    /**
     * The React children.
     */
    children: React.ReactNode;
    value: DragContextValue;
}
/**
 * A React provider that tracks the dragging state. This should
 * be placed at the root of any React application that supports
 * drag / drop.
 *
 * @param props
 */
interface ResetStateAction {
    type: 'resetState';
    payload?: string;
}
interface EndDraggingAction {
    type: 'endDragging';
    payload: {
        dragging: DraggingIdentifier;
    };
}
interface StartDraggingAction {
    type: 'startDragging';
    payload: {
        dragging: DraggingIdentifier;
        keyboardMode?: boolean;
    };
}
interface LeaveDropTargetAction {
    type: 'leaveDropTarget';
}
interface SelectDropTargetAction {
    type: 'selectDropTarget';
    payload: {
        dropTarget: DropIdentifier;
        dragging: DragDropIdentifier;
    };
}
interface DragToTargetAction {
    type: 'dropToTarget';
    payload: {
        dragging: DragDropIdentifier;
        dropTarget: DropIdentifier;
    };
}
interface RegisterDropTargetAction {
    type: 'registerDropTargets';
    payload: RegisteredDropTargets;
}
export type DragDropAction = ResetStateAction | RegisterDropTargetAction | LeaveDropTargetAction | SelectDropTargetAction | DragToTargetAction | StartDraggingAction | EndDraggingAction;
export declare function RootDragDropProvider({ children, customMiddleware, initialState, }: {
    children: React.ReactNode;
    customMiddleware?: CustomMiddleware;
    initialState?: Partial<DragContextState>;
}): React.JSX.Element;
export declare function nextValidDropTarget(dropTargetsByOrder: RegisteredDropTargets, hoveredDropTarget: DropIdentifier | undefined, draggingOrder: [string], filterElements?: (el: DragDropIdentifier) => boolean, reverse?: boolean): DropIdentifier | undefined;
/**
 * A React drag / drop provider that derives its state from a RootDragDropProvider. If
 * part of a React application is rendered separately from the root, this provider can
 * be used to enable drag / drop functionality within the disconnected part.
 *
 * @param props
 */
export declare function ChildDragDropProvider({ value, children }: ProviderProps): React.JSX.Element;
export {};
