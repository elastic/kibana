/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useReducer, Reducer, Dispatch } from 'react';
import classNames from 'classnames';
import { DEFAULT_DATA_TEST_SUBJ, REORDER_ITEM_HEIGHT } from '../constants';

/**
 * Reorder state
 */
export interface ReorderState {
  /**
   * Ids of the elements that are translated up or down
   */
  reorderedItems: Array<{ id: string; height?: number }>;

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

const initialState: ReorderState = {
  reorderedItems: [],
  direction: '-' as const,
  draggingHeight: REORDER_ITEM_HEIGHT,
  isReorderOn: false,
};

/**
 * Reorder context state
 */
export type ReorderContextState = [ReorderState, Dispatch<ReorderAction>];

/**
 * Reorder context
 */
export const ReorderContext = React.createContext<ReorderContextState>([
  initialState,
  () => () => {},
]);

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
  payload: { id: string; height: number };
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

type ReorderAction =
  | DragEndAction
  | ResetAction
  | RegisterDraggingItemHeightAction
  | RegisterReorderedItemHeightAction
  | SetIsReorderOnAction
  | SetReorderedItemsAction;

const reorderReducer = (state: ReorderState, action: ReorderAction) => {
  switch (action.type) {
    case 'dragEnd':
      return { ...state, reorderedItems: [], isReorderOn: false };
    case 'reset':
      return { ...state, reorderedItems: [] };
    case 'registerDraggingItemHeight':
      return { ...state, draggingHeight: action.payload };
    case 'registerReorderedItemHeight':
      return {
        ...state,
        reorderedItems: state.reorderedItems.map((i) =>
          i.id === action.payload.id ? { ...i, height: action.payload.height } : i
        ),
      };
    case 'setIsReorderOn':
      return {
        ...state,
        isReorderOn: action.payload,
        reorderedItems: action.payload ? state.reorderedItems : [],
      };
    case 'setReorderedItems':
      const { items, draggingIndex, droppingIndex } = action.payload;
      return draggingIndex < droppingIndex
        ? {
            ...state,
            reorderedItems: items.slice(draggingIndex + 1, droppingIndex + 1),
            direction: '-' as const,
          }
        : {
            ...state,
            reorderedItems: items.slice(droppingIndex, draggingIndex),
            direction: '+' as const,
          };
    default:
      return state;
  }
};

export function ReorderProvider({
  children,
  className,
  dataTestSubj = DEFAULT_DATA_TEST_SUBJ,
}: {
  children: React.ReactNode;
  className?: string;
  dataTestSubj?: string;
}) {
  const [state, dispatch] = useReducer<Reducer<ReorderState, ReorderAction>>(
    reorderReducer,
    initialState
  );

  return (
    <div
      data-test-subj={`${dataTestSubj}-reorderableGroup`}
      className={classNames(className, 'domDragDrop-group', {
        'domDragDrop-isActiveGroup': state.isReorderOn && React.Children.count(children) > 1,
      })}
    >
      <ReorderContext.Provider value={[state, dispatch]}>{children}</ReorderContext.Provider>
    </div>
  );
}
