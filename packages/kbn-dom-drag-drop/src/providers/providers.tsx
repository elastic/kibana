/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Reducer, useReducer } from 'react';
import { EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  DropIdentifier,
  DragDropIdentifier,
  RegisteredDropTargets,
  DragContextValue,
  DragContextState,
  CustomMiddleware,
  DraggingIdentifier,
} from './types';
import { DEFAULT_DATA_TEST_SUBJ } from '../constants';
import { announce } from './announcements';

const defaultState = {
  dragging: undefined,
  hoveredDropTarget: undefined,
  keyboardMode: false,
  dropTargetsByOrder: {},
  dataTestSubjPrefix: DEFAULT_DATA_TEST_SUBJ,
};
/**
 * The drag / drop context singleton, used like so:
 *
 * const [ state, dispatch ] = useDragDropContext();
 */
const DragContext = React.createContext<DragContextValue>([defaultState, () => {}]);

export function useDragDropContext() {
  const context = React.useContext(DragContext);
  if (context === undefined) {
    throw new Error(
      'useDragDropContext must be used within a <RootDragDropProvider/> or <ChildDragDropProvider/>'
    );
  }
  return context;
}

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

export type DragDropAction =
  | ResetStateAction
  | RegisterDropTargetAction
  | LeaveDropTargetAction
  | SelectDropTargetAction
  | DragToTargetAction
  | StartDraggingAction
  | EndDraggingAction;

const dragDropReducer = (state: DragContextState, action: DragDropAction) => {
  switch (action.type) {
    case 'resetState':
    case 'endDragging':
      return {
        ...state,
        dropTargetsByOrder: undefined,
        dragging: undefined,
        keyboardMode: false,
        hoveredDropTarget: undefined,
      };
    case 'registerDropTargets':
      return {
        ...state,
        dropTargetsByOrder: {
          ...state.dropTargetsByOrder,
          ...action.payload,
        },
      };
    case 'dropToTarget':
      return {
        ...state,
        dropTargetsByOrder: undefined,
        dragging: undefined,
        keyboardMode: false,
        hoveredDropTarget: undefined,
      };
    case 'leaveDropTarget':
      return {
        ...state,
        hoveredDropTarget: undefined,
      };
    case 'selectDropTarget':
      return {
        ...state,
        hoveredDropTarget: action.payload.dropTarget,
      };
    case 'startDragging':
      return {
        ...state,
        ...action.payload,
      };
    default:
      return state;
  }
};

const useReducerWithMiddleware = (
  reducer: Reducer<DragContextState, DragDropAction>,
  initState: DragContextState,
  middlewareFns?: Array<(action: DragDropAction) => void>
) => {
  const [state, dispatch] = useReducer(reducer, initState);

  const dispatchWithMiddleware = React.useCallback(
    (action: DragDropAction) => {
      if (middlewareFns !== undefined && middlewareFns.length > 0) {
        middlewareFns.forEach((middlewareFn) => middlewareFn(action));
      }
      dispatch(action);
    },
    [middlewareFns]
  );

  return [state, dispatchWithMiddleware] as const;
};

const useA11yMiddleware = () => {
  const [a11yMessage, setA11yMessage] = React.useState('');
  const a11yMiddleware = React.useCallback((action: DragDropAction) => {
    switch (action.type) {
      case 'startDragging':
        setA11yMessage(announce.lifted(action.payload.dragging.humanData));
        return;
      case 'selectDropTarget':
        setA11yMessage(
          announce.selectedTarget(
            action.payload.dragging.humanData,
            action.payload.dropTarget.humanData,
            action.payload.dropTarget.dropType
          )
        );
        return;
      case 'leaveDropTarget':
        setA11yMessage(announce.noTarget());
        return;
      case 'dropToTarget':
        const { dragging, dropTarget } = action.payload;
        setA11yMessage(
          announce.dropped(dragging.humanData, dropTarget.humanData, dropTarget.dropType)
        );
        return;
      case 'endDragging':
        setA11yMessage(announce.cancelled(action.payload.dragging.humanData));
        return;
      default:
        return;
    }
  }, []);
  return { a11yMessage, a11yMiddleware };
};

export function RootDragDropProvider({
  children,
  customMiddleware,
  initialState = {},
}: {
  children: React.ReactNode;
  customMiddleware?: CustomMiddleware;
  initialState?: Partial<DragContextState>;
}) {
  const { a11yMessage, a11yMiddleware } = useA11yMiddleware();
  const middlewareFns = React.useMemo(() => {
    return customMiddleware ? [customMiddleware, a11yMiddleware] : [a11yMiddleware];
  }, [customMiddleware, a11yMiddleware]);

  const dataTestSubj = initialState.dataTestSubjPrefix || DEFAULT_DATA_TEST_SUBJ;

  const [state, dispatch] = useReducerWithMiddleware(
    dragDropReducer,
    {
      ...defaultState,
      ...initialState,
    },
    middlewareFns
  );

  return (
    <>
      <ChildDragDropProvider value={[state, dispatch]}>{children}</ChildDragDropProvider>
      <EuiScreenReaderOnly>
        <div>
          <p aria-live="assertive" aria-atomic={true}>
            {a11yMessage}
          </p>
          <p id={`${dataTestSubj}-keyboardInstructionsWithReorder`}>
            {i18n.translate('domDragDrop.keyboardInstructionsReorder', {
              defaultMessage: `Press space or enter to start dragging. When dragging, use the up/down arrow keys to reorder items in the group and left/right arrow keys to choose drop targets outside of the group. Press space or enter again to finish.`,
            })}
          </p>
          <p id={`${dataTestSubj}-keyboardInstructions`}>
            {i18n.translate('domDragDrop.keyboardInstructions', {
              defaultMessage: `Press space or enter to start dragging. When dragging, use the left/right arrow keys to move between drop targets. Press space or enter again to finish.`,
            })}
          </p>
        </div>
      </EuiScreenReaderOnly>
    </>
  );
}

export function nextValidDropTarget(
  dropTargetsByOrder: RegisteredDropTargets,
  hoveredDropTarget: DropIdentifier | undefined,
  draggingOrder: [string],
  filterElements: (el: DragDropIdentifier) => boolean = () => true,
  reverse = false
) {
  if (!dropTargetsByOrder) {
    return;
  }

  const filteredTargets = Object.entries(dropTargetsByOrder).filter(([order, dropTarget]) => {
    return dropTarget && order !== draggingOrder[0] && filterElements(dropTarget);
  });

  // filter out secondary targets and targets with the same id as the dragging element
  const uniqueIdTargets = filteredTargets.reduce<Array<[string, DropIdentifier]>>(
    (acc, current) => {
      const [, currentDropTarget] = current;
      if (!currentDropTarget) {
        return acc;
      }
      if (acc.find(([, target]) => target?.id === currentDropTarget.id)) {
        return acc;
      }
      return [...acc, current];
    },
    []
  );

  const nextDropTargets = [...uniqueIdTargets, draggingOrder].sort(([orderA], [orderB]) => {
    const parsedOrderA = orderA.split(',').map((v) => Number(v));
    const parsedOrderB = orderB.split(',').map((v) => Number(v));

    const relevantLevel = parsedOrderA.findIndex((v, i) => parsedOrderA[i] !== parsedOrderB[i]);
    return parsedOrderA[relevantLevel] - parsedOrderB[relevantLevel];
  });

  let currentActiveDropIndex = nextDropTargets.findIndex(
    ([, dropTarget]) => typeof dropTarget === 'object' && dropTarget?.id === hoveredDropTarget?.id
  );

  if (currentActiveDropIndex === -1) {
    currentActiveDropIndex = nextDropTargets.findIndex(
      ([targetOrder]) => targetOrder === draggingOrder[0]
    );
  }

  const previousElement =
    (nextDropTargets.length + currentActiveDropIndex - 1) % nextDropTargets.length;
  const nextElement = (currentActiveDropIndex + 1) % nextDropTargets.length;

  return nextDropTargets[reverse ? previousElement : nextElement][1];
}

/**
 * A React drag / drop provider that derives its state from a RootDragDropProvider. If
 * part of a React application is rendered separately from the root, this provider can
 * be used to enable drag / drop functionality within the disconnected part.
 *
 * @param props
 */
export function ChildDragDropProvider({ value, children }: ProviderProps) {
  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
}
