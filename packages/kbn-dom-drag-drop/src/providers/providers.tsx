/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useMemo } from 'react';
import { EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  DropIdentifier,
  DraggingIdentifier,
  DragDropIdentifier,
  RegisteredDropTargets,
  DragContextState,
} from './types';
import { DEFAULT_DATA_TEST_SUBJ } from '../constants';

/**
 * The drag / drop context singleton, used like so:
 *
 * const { dragging, setDragging } = useContext(DragContext);
 */
export const DragContext = React.createContext<DragContextState>({
  dragging: undefined,
  setDragging: () => {},
  keyboardMode: false,
  setKeyboardMode: () => {},
  activeDropTarget: undefined,
  setActiveDropTarget: () => {},
  setA11yMessage: () => {},
  dropTargetsByOrder: undefined,
  registerDropTarget: () => {},
  dataTestSubjPrefix: DEFAULT_DATA_TEST_SUBJ,
  onTrackUICounterEvent: undefined,
});

/**
 * The argument to DragDropProvider.
 */
export interface ProviderProps extends DragContextState {
  /**
   * The React children.
   */
  children: React.ReactNode;
}

/**
 * A React provider that tracks the dragging state. This should
 * be placed at the root of any React application that supports
 * drag / drop.
 *
 * @param props
 */
export function RootDragDropProvider({
  children,
  dataTestSubj = DEFAULT_DATA_TEST_SUBJ,
  onTrackUICounterEvent,
}: {
  children: React.ReactNode;
  dataTestSubj?: string;
  onTrackUICounterEvent?: DragContextState['onTrackUICounterEvent'];
}) {
  const [draggingState, setDraggingState] = useState<{ dragging?: DraggingIdentifier }>({
    dragging: undefined,
  });
  const [keyboardModeState, setKeyboardModeState] = useState(false);
  const [a11yMessageState, setA11yMessageState] = useState('');
  const [activeDropTargetState, setActiveDropTargetState] = useState<DropIdentifier | undefined>(
    undefined
  );

  const [dropTargetsByOrderState, setDropTargetsByOrderState] = useState<RegisteredDropTargets>({});

  const setDragging = useMemo(
    () => (dragging?: DraggingIdentifier) => setDraggingState({ dragging }),
    [setDraggingState]
  );

  const setA11yMessage = useMemo(
    () => (message: string) => setA11yMessageState(message),
    [setA11yMessageState]
  );

  const setActiveDropTarget = useMemo(
    () => (activeDropTarget?: DropIdentifier) => setActiveDropTargetState(activeDropTarget),
    [setActiveDropTargetState]
  );

  const registerDropTarget = useMemo(
    () => (order: number[], dropTarget?: DropIdentifier) => {
      return setDropTargetsByOrderState((s) => {
        return {
          ...s,
          [order.join(',')]: dropTarget,
        };
      });
    },
    [setDropTargetsByOrderState]
  );

  return (
    <>
      <ChildDragDropProvider
        keyboardMode={keyboardModeState}
        setKeyboardMode={setKeyboardModeState}
        dragging={draggingState.dragging}
        setA11yMessage={setA11yMessage}
        setDragging={setDragging}
        activeDropTarget={activeDropTargetState}
        setActiveDropTarget={setActiveDropTarget}
        registerDropTarget={registerDropTarget}
        dropTargetsByOrder={dropTargetsByOrderState}
        dataTestSubjPrefix={dataTestSubj}
        onTrackUICounterEvent={onTrackUICounterEvent}
      >
        {children}
      </ChildDragDropProvider>
      <EuiScreenReaderOnly>
        <div>
          <p aria-live="assertive" aria-atomic={true}>
            {a11yMessageState}
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
  activeDropTarget: DropIdentifier | undefined,
  draggingOrder: [string],
  filterElements: (el: DragDropIdentifier) => boolean = () => true,
  reverse = false
) {
  if (!dropTargetsByOrder) {
    return;
  }

  const filteredTargets: Array<[string, DropIdentifier | undefined]> = Object.entries(
    dropTargetsByOrder
  ).filter(([, dropTarget]) => {
    return dropTarget && filterElements(dropTarget);
  });

  // filter out secondary targets
  const uniqueIdTargets = filteredTargets.reduce(
    (
      acc: Array<[string, DropIdentifier | undefined]>,
      current: [string, DropIdentifier | undefined]
    ) => {
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
    ([_, dropTarget]) => dropTarget?.id === activeDropTarget?.id
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
export function ChildDragDropProvider({
  dragging,
  setDragging,
  setKeyboardMode,
  keyboardMode,
  activeDropTarget,
  setActiveDropTarget,
  setA11yMessage,
  registerDropTarget,
  dropTargetsByOrder,
  dataTestSubjPrefix,
  onTrackUICounterEvent,
  children,
}: ProviderProps) {
  const value = useMemo(
    () => ({
      setKeyboardMode,
      keyboardMode,
      dragging,
      setDragging,
      activeDropTarget,
      setActiveDropTarget,
      setA11yMessage,
      dropTargetsByOrder,
      registerDropTarget,
      dataTestSubjPrefix,
      onTrackUICounterEvent,
    }),
    [
      setDragging,
      dragging,
      activeDropTarget,
      setActiveDropTarget,
      setKeyboardMode,
      keyboardMode,
      setA11yMessage,
      dropTargetsByOrder,
      registerDropTarget,
      dataTestSubjPrefix,
      onTrackUICounterEvent,
    ]
  );
  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
}
