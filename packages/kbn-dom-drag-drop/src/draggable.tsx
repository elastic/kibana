/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext, useCallback, useEffect, memo, useMemo } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import classNames from 'classnames';
import { keys, EuiScreenReaderOnly } from '@elastic/eui';
import {
  DragDropIdentifier,
  DropIdentifier,
  nextValidDropTarget,
  ReorderContext,
  RegisteredDropTargets,
  DragDropAction,
  useDragDropContext,
} from './providers';
import { REORDER_ITEM_MARGIN } from './constants';
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
  onDragStart?: (
    target?: DragEvent['currentTarget'] | KeyboardEvent<HTMLButtonElement>['currentTarget']
  ) => void;
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
  reorderableGroup?: Array<{ id: string }>;

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
 * The props for a draggable instance of that component.
 */
interface DraggableImplProps extends DraggableProps {
  dndDispatch: React.Dispatch<DragDropAction>;
  dataTestSubjPrefix?: string;
  draggedItemProps?: {
    keyboardMode: boolean;
    hoveredDropTarget?: DropIdentifier;
    dropTargetsByOrder: RegisteredDropTargets;
  };
  extraKeyboardHandler?: (e: KeyboardEvent<HTMLButtonElement>) => void;
  ariaDescribedBy?: string;
}

const REORDER_OFFSET = REORDER_ITEM_MARGIN / 2;

/**
 * Draggable component
 * @param props
 * @constructor
 */
export const Draggable = ({ reorderableGroup, ...props }: DraggableProps) => {
  const [
    { dragging, dropTargetsByOrder, hoveredDropTarget, keyboardMode, dataTestSubjPrefix },
    dndDispatch,
  ] = useDragDropContext();

  if (props.isDisabled) {
    return props.children;
  }

  const isDragging = props.value.id === dragging?.id;

  const draggableProps = {
    ...props,
    draggedItemProps: isDragging
      ? {
          keyboardMode,
          hoveredDropTarget,
          dropTargetsByOrder,
        }
      : undefined,
    dataTestSubjPrefix,
    dndDispatch,
  };
  if (reorderableGroup && reorderableGroup.length > 1) {
    return <ReorderableDraggableImpl {...draggableProps} reorderableGroup={reorderableGroup} />;
  } else {
    return <DraggableImpl {...draggableProps} />;
  }
};

const removeSelection = () => {
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }
};

const DraggableImpl = memo(function DraggableImpl({
  dataTestSubj,
  className,
  dragClassName,
  value,
  children,
  dndDispatch,
  order,
  draggedItemProps,
  dataTestSubjPrefix,
  dragType,
  onDragStart,
  onDragEnd,
  extraKeyboardHandler,
  ariaDescribedBy,
}: DraggableImplProps) {
  const { keyboardMode, hoveredDropTarget, dropTargetsByOrder } = draggedItemProps || {};

  const setTarget = useCallback(
    (target?: DropIdentifier) => {
      if (!target) {
        dndDispatch({
          type: 'leaveDropTarget',
        });
      } else {
        dndDispatch({
          type: 'selectDropTarget',
          payload: {
            dropTarget: target,
            dragging: value,
          },
        });
      }
    },
    [dndDispatch, value]
  );

  const setTargetOfIndex = useCallback(
    (id: string, index: number) => {
      const dropTargetsForActiveId =
        dropTargetsByOrder &&
        Object.values(dropTargetsByOrder).filter((dropTarget) => dropTarget?.id === id);
      setTarget(dropTargetsForActiveId?.[index]);
    },
    [dropTargetsByOrder, setTarget]
  );
  const modifierHandlers = useMemo(() => {
    const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (hoveredDropTarget?.id && ['Shift', 'Alt', 'Control'].includes(e.key)) {
        if (e.altKey) {
          setTargetOfIndex(hoveredDropTarget.id, 1);
        } else if (e.shiftKey) {
          setTargetOfIndex(hoveredDropTarget.id, 2);
        } else if (e.ctrlKey) {
          // the control option is available either for new or existing cases,
          // so need to offset based on some flags
          const offsetIndex =
            Number(hoveredDropTarget.humanData.canSwap) +
            Number(hoveredDropTarget.humanData.canDuplicate);
          setTargetOfIndex(hoveredDropTarget.id, offsetIndex + 1);
        } else {
          setTargetOfIndex(hoveredDropTarget.id, 0);
        }
      }
    };
    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (e.key === 'Alt' && hoveredDropTarget?.id) {
        setTargetOfIndex(hoveredDropTarget.id, 1);
      } else if (e.key === 'Shift' && hoveredDropTarget?.id) {
        setTargetOfIndex(hoveredDropTarget.id, 2);
      } else if (e.key === 'Control' && hoveredDropTarget?.id) {
        // the control option is available either for new or existing cases,
        // so need to offset based on some flags
        const offsetIndex =
          Number(hoveredDropTarget.humanData.canSwap) +
          Number(hoveredDropTarget.humanData.canDuplicate);
        setTargetOfIndex(hoveredDropTarget.id, offsetIndex + 1);
      }
    };
    return { onKeyDown, onKeyUp };
  }, [hoveredDropTarget, setTargetOfIndex]);

  const dragStart = useCallback(
    (e: DragEvent | KeyboardEvent<HTMLButtonElement>, keyboardModeOn?: boolean) => {
      // Setting stopPropgagation causes Chrome failures, so
      // we are manually checking if we've already handled this
      // in a nested child, and doing nothing if so...
      if (e && 'dataTransfer' in e && e.dataTransfer.getData('text')) {
        return;
      }

      // We only can reach the dragStart method if the element is draggable,
      // so we know we have DraggableProps if we reach this code.
      if (e && 'dataTransfer' in e) {
        e.dataTransfer.setData('text', value.humanData.label);
      }

      // Chrome causes issues if you try to render from within a
      // dragStart event, so we drop a setTimeout to avoid that.

      const currentTarget = e?.currentTarget;
      onDragStart?.(e?.currentTarget);

      // Apply an optional class to the element being dragged so the ghost
      // can be styled. We must add it to the actual element for a single
      // frame before removing it so the ghost picks up the styling.
      const current = e.currentTarget;

      if (dragClassName && !current.classList.contains(dragClassName)) {
        current.classList.add(dragClassName);
        requestAnimationFrame(() => {
          current.classList.remove(dragClassName);
        });
      }

      setTimeout(() => {
        dndDispatch({
          type: 'startDragging',
          payload: {
            ...(keyboardModeOn ? { keyboardMode: true } : {}),
            dragging: {
              ...value,
              ghost: keyboardModeOn
                ? {
                    children,
                    className: classNames(dragClassName),
                    style: {
                      width: currentTarget.offsetWidth,
                      minHeight: currentTarget?.offsetHeight,
                      zIndex: 1000,
                    },
                  }
                : undefined,
            },
          },
        });
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dndDispatch, value, onDragStart]
  );

  const dragEnd = useCallback(
    (e?: DragEvent) => {
      e?.stopPropagation();

      dndDispatch({
        type: 'endDragging',
        payload: { dragging: value },
      });
      onDragEnd?.();
    },
    [dndDispatch, value, onDragEnd]
  );

  const setNextTarget = (e: KeyboardEvent<HTMLButtonElement>, reversed = false) => {
    const nextTarget = nextValidDropTarget(
      dropTargetsByOrder,
      hoveredDropTarget,
      [order.join(',')],
      (el) => el?.dropType !== 'reorder',
      reversed
    );
    if (typeof nextTarget === 'string' || nextTarget === undefined) {
      return setTarget(undefined);
    } else if (e.altKey) {
      return setTargetOfIndex(nextTarget.id, 1);
    } else if (e.shiftKey) {
      return setTargetOfIndex(nextTarget.id, 2);
    } else if (e.ctrlKey) {
      return setTargetOfIndex(nextTarget.id, 3);
    }
    return setTarget(nextTarget);
  };

  const dropToSelectedDropTarget = () => {
    if (hoveredDropTarget) {
      const { dropType, onDrop } = hoveredDropTarget;
      setTimeout(() => {
        dndDispatch({
          type: 'dropToTarget',
          payload: {
            dragging: value,
            dropTarget: hoveredDropTarget,
          },
        });
      });
      onDrop(value, dropType);
    }
  };

  const shouldShowGhostImageInstead =
    dragType === 'move' &&
    keyboardMode &&
    hoveredDropTarget &&
    hoveredDropTarget.dropType !== 'reorder';

  return (
    <div
      className={classNames(className, 'domDraggable', {
        'domDraggable_active--move': draggedItemProps && dragType === 'move' && !keyboardMode,
        'domDraggable_dragover_keyboard--move': shouldShowGhostImageInstead,
        'domDraggable_active--copy': draggedItemProps && dragType === 'copy' && !keyboardMode,
        'domDraggable_dragover_keyboard--copy':
          keyboardMode && draggedItemProps && hoveredDropTarget,
      })}
      data-test-subj={dataTestSubj || `${dataTestSubjPrefix}_domDraggable_${value.humanData.label}`}
      draggable
      onDragEnd={dragEnd}
      onDragStart={dragStart}
      onMouseDown={removeSelection}
    >
      <EuiScreenReaderOnly showOnFocus>
        <button
          aria-label={value.humanData.label}
          aria-describedby={ariaDescribedBy || `${dataTestSubjPrefix}-keyboardInstructions`}
          className="domDraggable__keyboardHandler"
          data-test-subj={`${dataTestSubjPrefix}-keyboardHandler`}
          onBlur={(e) => {
            if (draggedItemProps) {
              dragEnd();
            }
          }}
          onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
            const { key } = e;
            if (key === keys.ENTER || key === keys.SPACE) {
              if (hoveredDropTarget) {
                dropToSelectedDropTarget();
              }

              if (draggedItemProps) {
                dragEnd();
              } else {
                dragStart(e, true);
              }
            } else if (key === keys.ESCAPE) {
              if (draggedItemProps) {
                e.stopPropagation();
                e.preventDefault();
                dragEnd();
              }
            }
            if (extraKeyboardHandler) {
              extraKeyboardHandler(e);
            }
            if (keyboardMode) {
              if (keys.ARROW_LEFT === key || keys.ARROW_RIGHT === key) {
                setNextTarget(e, !!(keys.ARROW_LEFT === key));
              }
              modifierHandlers.onKeyDown(e);
            }
          }}
          onKeyUp={modifierHandlers.onKeyUp}
        />
      </EuiScreenReaderOnly>
      {children}
    </div>
  );
});

const ReorderableDraggableImpl = memo(function ReorderableDraggableImpl(
  props: DraggableImplProps & {
    reorderableGroup: Array<{ id: string }>;
    dragging?: DragDropIdentifier;
  }
) {
  const [{ isReorderOn, reorderedItems, direction }, reorderDispatch] = useContext(ReorderContext);

  const { value, draggedItemProps, reorderableGroup, dndDispatch, dataTestSubjPrefix } = props;

  const { keyboardMode, hoveredDropTarget, dropTargetsByOrder } = draggedItemProps || {};
  const isDragging = !!draggedItemProps;

  const isFocusInGroup = keyboardMode
    ? isDragging &&
      (!hoveredDropTarget || reorderableGroup.some((i) => i.id === hoveredDropTarget?.id))
    : isDragging;

  useEffect(() => {
    return () => reorderDispatch({ type: 'dragEnd' });
  }, [reorderDispatch]);

  useEffect(() => {
    reorderDispatch({
      type: 'setIsReorderOn',
      payload: isFocusInGroup,
    });
  }, [reorderDispatch, isFocusInGroup]);

  const onReorderableDragStart = (
    currentTarget?: DragEvent['currentTarget'] | KeyboardEvent<HTMLButtonElement>['currentTarget']
  ) => {
    if (currentTarget) {
      setTimeout(() => {
        reorderDispatch({
          type: 'registerDraggingItemHeight',
          payload: currentTarget.clientHeight + REORDER_OFFSET,
        });
      });
    }
  };

  const onReorderableDragEnd = () => {
    reorderDispatch({ type: 'dragEnd' });
  };

  const extraKeyboardHandler = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (isReorderOn && keyboardMode) {
      e.stopPropagation();
      e.preventDefault();
      let activeDropTargetIndex = reorderableGroup.findIndex((i) => i.id === value.id);
      if (hoveredDropTarget) {
        const index = reorderableGroup.findIndex((i) => i.id === hoveredDropTarget?.id);
        if (index !== -1) activeDropTargetIndex = index;
      }
      if (e.key === keys.ARROW_LEFT || e.key === keys.ARROW_RIGHT) {
        reorderDispatch({ type: 'reset' });
      } else if (keys.ARROW_DOWN === e.key) {
        if (activeDropTargetIndex < reorderableGroup.length - 1) {
          const nextTarget = nextValidDropTarget(
            dropTargetsByOrder,
            hoveredDropTarget,
            [props.order.join(',')],
            (el) => el?.dropType === 'reorder'
          );
          onReorderableDragOver(nextTarget);
        }
      } else if (keys.ARROW_UP === e.key) {
        if (activeDropTargetIndex > 0) {
          const nextTarget = nextValidDropTarget(
            dropTargetsByOrder,
            hoveredDropTarget,
            [props.order.join(',')],
            (el) => el?.dropType === 'reorder',
            true
          );
          onReorderableDragOver(nextTarget);
        }
      }
    }
  };

  const onReorderableDragOver = (target?: DropIdentifier) => {
    if (!target) {
      reorderDispatch({ type: 'reset' });
      dndDispatch({ type: 'leaveDropTarget' });
      return;
    }
    const droppingIndex = reorderableGroup.findIndex((i) => i.id === target.id);
    const draggingIndex = reorderableGroup.findIndex((i) => i.id === value?.id);
    if (draggingIndex === -1) {
      return;
    }

    dndDispatch({
      type: 'selectDropTarget',
      payload: {
        dropTarget: target,
        dragging: value,
      },
    });
    reorderDispatch({
      type: 'setReorderedItems',
      payload: { draggingIndex, droppingIndex, items: reorderableGroup },
    });
  };

  const areItemsReordered = keyboardMode && isDragging && reorderedItems.length;

  return (
    <div
      data-test-subj={`${dataTestSubjPrefix}-reorderableDrag`}
      className={classNames({
        ['domDraggable--reorderable']: isDragging,
        ['domDraggable_active_keyboard--reorderable']: keyboardMode && isDragging,
      })}
      style={
        areItemsReordered
          ? {
              transform: `translateY(${direction === '+' ? '-' : '+'}${reorderedItems.reduce(
                (acc, el) => acc + (el.height ?? 0) + REORDER_OFFSET,
                0
              )}px)`,
            }
          : undefined
      }
    >
      <DraggableImpl
        {...props}
        ariaDescribedBy={`${dataTestSubjPrefix}-keyboardInstructionsWithReorder`}
        extraKeyboardHandler={extraKeyboardHandler}
        onDragStart={onReorderableDragStart}
        onDragEnd={onReorderableDragEnd}
      />
    </div>
  );
});
