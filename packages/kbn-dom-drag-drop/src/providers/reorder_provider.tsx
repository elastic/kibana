/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useMemo } from 'react';
import classNames from 'classnames';
import { DEFAULT_DATA_TEST_SUBJ } from '../constants';

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
  /**
   * reorder group needed for screen reader aria-described-by attribute
   */
  groupId: string;
}

type SetReorderStateDispatch = (prevState: ReorderState) => ReorderState;

/**
 * Reorder context state
 */
export interface ReorderContextState {
  reorderState: ReorderState;
  setReorderState: (dispatch: SetReorderStateDispatch) => void;
}

/**
 * Reorder context
 */
export const ReorderContext = React.createContext<ReorderContextState>({
  reorderState: {
    reorderedItems: [],
    direction: '-',
    draggingHeight: 40,
    isReorderOn: false,
    groupId: '',
  },
  setReorderState: () => () => {},
});

/**
 * To create a reordering group, surround the elements from the same group with a `ReorderProvider`
 * @param id
 * @param children
 * @param className
 * @param dataTestSubj
 * @constructor
 */
export function ReorderProvider({
  id,
  children,
  className,
  dataTestSubj = DEFAULT_DATA_TEST_SUBJ,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  dataTestSubj?: string;
}) {
  const [state, setState] = useState<ReorderContextState['reorderState']>({
    reorderedItems: [],
    direction: '-',
    draggingHeight: 40,
    isReorderOn: false,
    groupId: id,
  });

  const setReorderState = useMemo(
    () => (dispatch: SetReorderStateDispatch) => setState(dispatch),
    [setState]
  );

  return (
    <div
      data-test-subj={`${dataTestSubj}-reorderableGroup`}
      className={classNames(className, {
        'domDragDrop-isActiveGroup': state.isReorderOn && React.Children.count(children) > 1,
      })}
    >
      <ReorderContext.Provider value={{ reorderState: state, setReorderState }}>
        {children}
      </ReorderContext.Provider>
    </div>
  );
}
