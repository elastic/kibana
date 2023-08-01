/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useCallback, useEffect, memo, useMemo, useState, useRef } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import classNames from 'classnames';
import { keys, EuiScreenReaderOnly, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import useShallowCompareEffect from 'react-use/lib/useShallowCompareEffect';
import {
  DragDropIdentifier,
  DropIdentifier,
  nextValidDropTarget,
  ReorderContext,
  DropHandler,
  Ghost,
  RegisteredDropTargets,
  DragDropAction,
  DragContextState,
  useDragDropContext,
} from './providers';
import { DropType } from './types';
import { REORDER_ITEM_MARGIN } from './constants';
import './sass/drag_drop.scss';

/**
 * Droppable event
 */
export type DroppableEvent = React.DragEvent<HTMLElement>;

const noop = () => {};

/**
 * The base props to the DragDrop component.
 */
interface BaseProps {
  /**
   * The CSS class(es) for the root element.
   */
  className?: string;

  /**
   * The event handler that fires when an item
   * is dropped onto this DragDrop component.
   */
  onDrop?: DropHandler;
  /**
   * The event handler that fires when this element is dragged.
   */
  onDragStart?: (
    target?: DroppableEvent['currentTarget'] | KeyboardEvent<HTMLButtonElement>['currentTarget']
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
   * Indicates whether or not this component is draggable.
   */
  draggable?: boolean;
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
  reorderableGroup?: Array<{ id: string }>;

  /**
   * Indicates to the user whether the currently dragged item
   * will be moved or copied
   */
  dragType?: 'copy' | 'move';

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
 * The props for a draggable instance of that component.
 */
interface DragInnerProps extends BaseProps {
  dndDispatch: React.Dispatch<DragDropAction>;
  dataTestSubjPrefix?: string;
  activeDraggingProps?: {
    keyboardMode: boolean;
    activeDropTarget?: DropIdentifier;
    dropTargetsByOrder: RegisteredDropTargets;
  };
  extraKeyboardHandler?: (e: KeyboardEvent<HTMLButtonElement>) => void;
  ariaDescribedBy?: string;
}

/**
 * The props for a non-draggable instance of that component.
 */
interface DropsInnerProps extends BaseProps {
  dndState: DragContextState;
  dndDispatch: React.Dispatch<DragDropAction>;
  isNotDroppable: boolean;
}

const REORDER_OFFSET = REORDER_ITEM_MARGIN / 2;

/**
 * DragDrop component
 * @param props
 * @constructor
 */
export const DragDrop = (props: BaseProps) => {
  const [dndState, dndDispatch] = useDragDropContext();

  const { dragging, dropTargetsByOrder } = dndState;

  if (props.isDisabled) {
    return props.children;
  }

  const { value, draggable, dropTypes, reorderableGroup } = props;
  const isDragging = !!(draggable && value.id === dragging?.id);

  const activeDraggingProps = isDragging
    ? {
        keyboardMode: dndState.keyboardMode,
        activeDropTarget: dndState.activeDropTarget,
        dropTargetsByOrder,
      }
    : undefined;

  if (draggable && (!dropTypes || !dropTypes.length)) {
    const dragProps = {
      ...props,
      activeDraggingProps,
      dataTestSubjPrefix: dndState.dataTestSubjPrefix,
      dndDispatch,
    };
    if (reorderableGroup && reorderableGroup.length > 1) {
      return <ReorderableDrag {...dragProps} reorderableGroup={reorderableGroup} />;
    } else {
      return <DragInner {...dragProps} />;
    }
  }

  const dropProps = {
    ...props,
    dndState,
    dndDispatch,
    isNotDroppable:
      // If the configuration has provided a droppable flag, but this particular item is not
      // droppable, then it should be less prominent. Ignores items that are both
      // draggable and drop targets
      !!((!dropTypes || !dropTypes.length) && dragging && value.id !== dragging.id),
  };
  if (
    reorderableGroup &&
    reorderableGroup.length > 1 &&
    reorderableGroup?.some((i) => i.id === dragging?.id) &&
    dropTypes?.[0] === 'reorder'
  ) {
    return <ReorderableDrop {...dropProps} reorderableGroup={reorderableGroup} />;
  }
  return <DropsInner {...dropProps} />;
};

const removeSelection = () => {
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }
};

const DragInner = memo(function DragInner({
  dataTestSubj,
  className,
  value,
  children,
  dndDispatch,
  order,
  activeDraggingProps,
  dataTestSubjPrefix,
  dragType,
  onDragStart,
  onDragEnd,
  extraKeyboardHandler,
  ariaDescribedBy,
}: DragInnerProps) {
  const { keyboardMode, activeDropTarget, dropTargetsByOrder } = activeDraggingProps || {};

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
      if (activeDropTarget?.id && ['Shift', 'Alt', 'Control'].includes(e.key)) {
        if (e.altKey) {
          setTargetOfIndex(activeDropTarget.id, 1);
        } else if (e.shiftKey) {
          setTargetOfIndex(activeDropTarget.id, 2);
        } else if (e.ctrlKey) {
          // the control option is available either for new or existing cases,
          // so need to offset based on some flags
          const offsetIndex =
            Number(activeDropTarget.humanData.canSwap) +
            Number(activeDropTarget.humanData.canDuplicate);
          setTargetOfIndex(activeDropTarget.id, offsetIndex + 1);
        } else {
          setTargetOfIndex(activeDropTarget.id, 0);
        }
      }
    };
    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (e.key === 'Alt' && activeDropTarget?.id) {
        setTargetOfIndex(activeDropTarget.id, 1);
      } else if (e.key === 'Shift' && activeDropTarget?.id) {
        setTargetOfIndex(activeDropTarget.id, 2);
      } else if (e.key === 'Control' && activeDropTarget?.id) {
        // the control option is available either for new or existing cases,
        // so need to offset based on some flags
        const offsetIndex =
          Number(activeDropTarget.humanData.canSwap) +
          Number(activeDropTarget.humanData.canDuplicate);
        setTargetOfIndex(activeDropTarget.id, offsetIndex + 1);
      }
    };
    return { onKeyDown, onKeyUp };
  }, [activeDropTarget, setTargetOfIndex]);

  const dragStart = useCallback(
    (e: DroppableEvent | KeyboardEvent<HTMLButtonElement>, keyboardModeOn?: boolean) => {
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
                    style: {
                      width: currentTarget.offsetWidth,
                      minHeight: currentTarget?.offsetHeight,
                    },
                  }
                : undefined,
            },
          },
        });
        onDragStart?.(currentTarget);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dndDispatch, value, onDragStart]
  );

  const dragEnd = useCallback(
    (e?: DroppableEvent) => {
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
      activeDropTarget,
      [order.join(',')],
      (el) => el?.dropType !== 'reorder',
      reversed
    );

    if (e.altKey && nextTarget?.id) {
      setTargetOfIndex(nextTarget.id, 1);
    } else if (e.shiftKey && nextTarget?.id) {
      setTargetOfIndex(nextTarget.id, 2);
    } else if (e.ctrlKey && nextTarget?.id) {
      setTargetOfIndex(nextTarget.id, 3);
    } else {
      setTarget(nextTarget);
    }
  };

  const dropToActiveDropTarget = () => {
    if (activeDropTarget) {
      const { dropType, onDrop } = activeDropTarget;
      setTimeout(() => {
        dndDispatch({
          type: 'dropToTarget',
          payload: {
            dragging: value,
            dropTarget: activeDropTarget,
          },
        });
      });
      onDrop(value, dropType);
    }
  };

  const shouldShowGhostImageInstead =
    dragType === 'move' &&
    keyboardMode &&
    activeDropTarget &&
    activeDropTarget.dropType !== 'reorder';

  return (
    <div
      className={classNames(className, {
        'domDragDrop-isHidden':
          (activeDraggingProps && dragType === 'move' && !keyboardMode) ||
          shouldShowGhostImageInstead,
        'domDragDrop--isDragStarted': activeDraggingProps,
      })}
      data-test-subj={`${dataTestSubjPrefix}_draggable-${value.humanData.label}`}
    >
      <EuiScreenReaderOnly showOnFocus>
        <button
          aria-label={value.humanData.label}
          aria-describedby={ariaDescribedBy || `${dataTestSubjPrefix}-keyboardInstructions`}
          className="domDragDrop__keyboardHandler"
          data-test-subj={`${dataTestSubjPrefix}-keyboardHandler`}
          onBlur={(e) => {
            if (activeDraggingProps) {
              dragEnd();
            }
          }}
          onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
            const { key } = e;
            if (key === keys.ENTER || key === keys.SPACE) {
              if (activeDropTarget) {
                dropToActiveDropTarget();
              }

              if (activeDraggingProps) {
                dragEnd();
              } else {
                dragStart(e, true);
              }
            } else if (key === keys.ESCAPE) {
              if (activeDraggingProps) {
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

      {React.cloneElement(children, {
        'data-test-subj': dataTestSubj || dataTestSubjPrefix,
        className: classNames(children.props.className, 'domDragDrop', 'domDragDrop-isDraggable'),
        draggable: true,
        onDragEnd: dragEnd,
        onDragStart: dragStart,
        onMouseDown: removeSelection,
      })}
    </div>
  );
});

const DropsInner = memo(function DropsInner(props: DropsInnerProps) {
  const {
    dataTestSubj,
    className,
    onDrop,
    value,
    children,
    draggable,
    dndState,
    dndDispatch,
    isNotDroppable,
    dropTypes,
    order,
    getAdditionalClassesOnEnter,
    getAdditionalClassesOnDroppable,
    getCustomDropTarget,
  } = props;

  const { dragging, activeDropTarget, dataTestSubjPrefix, keyboardMode } = dndState;

  const [isInZone, setIsInZone] = useState(false);
  const mainTargetRef = useRef<HTMLDivElement>(null);

  useShallowCompareEffect(() => {
    if (dropTypes && dropTypes?.[0] && onDrop && keyboardMode) {
      dndDispatch({
        type: 'registerDropTargets',
        payload: dropTypes.reduce(
          (acc, dropType, index) => ({
            ...acc,
            [[...props.order, index].join(',')]: { ...value, onDrop, dropType },
          }),
          {}
        ),
      });
    }
  }, [order, dndDispatch, dropTypes, keyboardMode]);

  useEffect(() => {
    let isMounted = true;
    if (activeDropTarget && activeDropTarget.id !== value.id) {
      setIsInZone(false);
    }
    setTimeout(() => {
      if (!activeDropTarget && isMounted) {
        setIsInZone(false);
      }
    }, 1000);
    return () => {
      isMounted = false;
    };
  }, [activeDropTarget, setIsInZone, value.id]);

  const dragEnter = () => {
    if (!isInZone) {
      setIsInZone(true);
    }
  };

  const getModifiedDropType = (e: DroppableEvent, dropType: DropType) => {
    if (!dropTypes || dropTypes.length <= 1) {
      return dropType;
    }
    const dropIndex = dropTypes.indexOf(dropType);
    if (dropIndex > 0) {
      return dropType;
    } else if (dropIndex === 0) {
      if (e.altKey && dropTypes[1]) {
        return dropTypes[1];
      } else if (e.shiftKey && dropTypes[2]) {
        return dropTypes[2];
      } else if (e.ctrlKey && (dropTypes.length > 3 ? dropTypes[3] : dropTypes[1])) {
        return dropTypes.length > 3 ? dropTypes[3] : dropTypes[1];
      }
    }
    return dropType;
  };

  const dragOver = (e: DroppableEvent, dropType: DropType) => {
    e.preventDefault();
    if (!dragging || !onDrop) {
      return;
    }

    const modifiedDropType = getModifiedDropType(e, dropType);
    const isActiveDropTarget = !!(
      activeDropTarget?.id === value.id && activeDropTarget?.dropType === modifiedDropType
    );
    // An optimization to prevent a bunch of React churn.
    if (!isActiveDropTarget) {
      dndDispatch({
        type: 'selectDropTarget',
        payload: {
          dropTarget: { ...value, dropType: modifiedDropType, onDrop },
          dragging,
        },
      });
    }
  };

  const dragLeave = () => {
    dndDispatch({ type: 'leaveDropTarget' });
  };

  const drop = (e: DroppableEvent, dropType: DropType) => {
    e.preventDefault();
    e.stopPropagation();
    setIsInZone(false);
    if (onDrop && dragging) {
      const modifiedDropType = getModifiedDropType(e, dropType);
      onDrop(dragging, modifiedDropType);
      setTimeout(() => {
        dndDispatch({
          type: 'dropToTarget',
          payload: {
            dragging,
            dropTarget: { ...value, dropType: modifiedDropType, onDrop },
          },
        });
      });
    }
    dndDispatch({ type: 'resetState' });
  };

  const getProps = (dropType?: DropType, dropChildren?: ReactElement) => {
    const isActiveDropTarget = Boolean(
      activeDropTarget?.id === value.id && dropType === activeDropTarget?.dropType
    );
    return {
      'data-test-subj': dataTestSubj || dataTestSubjPrefix,
      className: getClasses(dropType, dropChildren),
      onDragEnter: dragEnter,
      onDragLeave: dragLeave,
      onDragOver: dropType ? (e: DroppableEvent) => dragOver(e, dropType) : noop,
      onDrop: dropType ? (e: DroppableEvent) => drop(e, dropType) : noop,
      draggable,
      ghost:
        (isActiveDropTarget && dropType !== 'reorder' && dragging?.ghost && dragging.ghost) ||
        undefined,
    };
  };

  const getClasses = (dropType?: DropType, dropChildren = children) => {
    const isActiveDropTarget = Boolean(
      activeDropTarget?.id === value.id && dropType === activeDropTarget?.dropType
    );
    const classesOnDroppable = getAdditionalClassesOnDroppable?.(dropType);

    const classes = classNames(
      'domDragDrop',
      {
        'domDragDrop-isDraggable': draggable,
        'domDragDrop-isDroppable': !draggable,
        'domDragDrop-isDropTarget': dropType,
        'domDragDrop-isActiveDropTarget': dropType && isActiveDropTarget,
        'domDragDrop-isNotDroppable': isNotDroppable,
      },
      classesOnDroppable && { [classesOnDroppable]: dropType }
    );
    return classNames(classes, className, dropChildren.props.className);
  };

  const getMainTargetClasses = () => {
    const classesOnEnter = getAdditionalClassesOnEnter?.(activeDropTarget?.dropType);
    return classNames(classesOnEnter && { [classesOnEnter]: activeDropTarget?.id === value.id });
  };

  const mainTargetProps = getProps(dropTypes && dropTypes[0]);

  return (
    <div
      data-test-subj={`${dataTestSubjPrefix}Container`}
      className={classNames('domDragDrop__container', {
        'domDragDrop__container-active': isInZone || activeDropTarget?.id === value.id,
      })}
      onDragEnter={dragEnter}
      ref={mainTargetRef}
    >
      <SingleDropInner
        {...mainTargetProps}
        className={classNames(mainTargetProps.className, getMainTargetClasses())}
        children={children}
      />
      {dropTypes && dropTypes.length > 1 && (
        <EuiFlexGroup
          gutterSize="none"
          direction="column"
          data-test-subj={`${dataTestSubjPrefix}ExtraDrops`}
          className={classNames('domDragDrop__extraDrops', {
            'domDragDrop__extraDrops-visible': isInZone || activeDropTarget?.id === value.id,
          })}
        >
          {dropTypes.slice(1).map((dropType) => {
            const dropChildren = getCustomDropTarget?.(dropType);
            return dropChildren ? (
              <EuiFlexItem key={dropType} className="domDragDrop__extraDropWrapper">
                <SingleDropInner {...getProps(dropType, dropChildren)}>
                  {dropChildren}
                </SingleDropInner>
              </EuiFlexItem>
            ) : null;
          })}
        </EuiFlexGroup>
      )}
    </div>
  );
});

const SingleDropInner = ({
  ghost,
  children,
  ...rest
}: {
  ghost?: Ghost;
  children: ReactElement;
  style?: React.CSSProperties;
  className?: string;
}) => {
  return (
    <>
      {React.cloneElement(children, rest)}
      {ghost
        ? React.cloneElement(ghost.children, {
            className: classNames(ghost.children.props.className, 'domDragDrop_ghost'),
            style: ghost.style,
          })
        : null}
    </>
  );
};

const ReorderableDrag = memo(function ReorderableDrag(
  props: DragInnerProps & { reorderableGroup: Array<{ id: string }>; dragging?: DragDropIdentifier }
) {
  const [{ isReorderOn, reorderedItems, direction }, reorderDispatch] = useContext(ReorderContext);

  const { value, activeDraggingProps, reorderableGroup, dndDispatch, dataTestSubjPrefix } = props;

  const { keyboardMode, activeDropTarget, dropTargetsByOrder } = activeDraggingProps || {};
  const isDragging = !!activeDraggingProps;

  const isFocusInGroup = keyboardMode
    ? isDragging &&
      (!activeDropTarget || reorderableGroup.some((i) => i.id === activeDropTarget?.id))
    : isDragging;

  useEffect(() => {
    reorderDispatch({
      type: 'setIsReorderOn',
      payload: isFocusInGroup,
    });
  }, [reorderDispatch, isFocusInGroup]);

  const onReorderableDragStart = (
    currentTarget?:
      | DroppableEvent['currentTarget']
      | KeyboardEvent<HTMLButtonElement>['currentTarget']
  ) => {
    if (currentTarget) {
      setTimeout(() => {
        reorderDispatch({
          type: 'registerDraggingItemHeight',
          payload: currentTarget.offsetHeight + REORDER_OFFSET,
        });
      });
    }
  };

  const onReorderableDragEnd = () => {
    reorderDispatch({ type: 'reset' });
  };

  const extraKeyboardHandler = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (isReorderOn && keyboardMode) {
      e.stopPropagation();
      e.preventDefault();
      let activeDropTargetIndex = reorderableGroup.findIndex((i) => i.id === value.id);
      if (activeDropTarget) {
        const index = reorderableGroup.findIndex((i) => i.id === activeDropTarget?.id);
        if (index !== -1) activeDropTargetIndex = index;
      }
      if (e.key === keys.ARROW_LEFT || e.key === keys.ARROW_RIGHT) {
        reorderDispatch({ type: 'reset' });
      } else if (keys.ARROW_DOWN === e.key) {
        if (activeDropTargetIndex < reorderableGroup.length - 1) {
          const nextTarget = nextValidDropTarget(
            dropTargetsByOrder,
            activeDropTarget,
            [props.order.join(',')],
            (el) => el?.dropType === 'reorder'
          );
          onReorderableDragOver(nextTarget);
        }
      } else if (keys.ARROW_UP === e.key) {
        if (activeDropTargetIndex > 0) {
          const nextTarget = nextValidDropTarget(
            dropTargetsByOrder,
            activeDropTarget,
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
      className={classNames('domDragDrop-reorderable', {
        ['domDragDrop-translatableDrag']: isDragging,
        ['domDragDrop-isKeyboardReorderInProgress']: keyboardMode && isDragging,
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
      <DragInner
        {...props}
        ariaDescribedBy={`${dataTestSubjPrefix}-keyboardInstructionsWithReorder`}
        extraKeyboardHandler={extraKeyboardHandler}
        onDragStart={onReorderableDragStart}
        onDragEnd={onReorderableDragEnd}
      />
    </div>
  );
});

const ReorderableDrop = memo(function ReorderableDrop(
  props: DropsInnerProps & { reorderableGroup: Array<{ id: string }> }
) {
  const { onDrop, value, dndState, dndDispatch, reorderableGroup } = props;

  const { dragging, dataTestSubjPrefix, activeDropTarget } = dndState;
  const currentIndex = reorderableGroup.findIndex((i) => i.id === value.id);

  const [{ isReorderOn, reorderedItems, draggingHeight, direction }, reorderDispatch] =
    useContext(ReorderContext);

  const heightRef = useRef<HTMLDivElement>(null);

  const isReordered =
    isReorderOn && reorderedItems.some((el) => el.id === value.id) && reorderedItems.length;

  useEffect(() => {
    if (isReordered && heightRef.current?.clientHeight) {
      reorderDispatch({
        type: 'registerReorderedItemHeight',
        payload: { id: value.id, height: heightRef.current.clientHeight },
      });
    }
  }, [isReordered, reorderDispatch, value.id]);

  const onReorderableDragOver = (e: DroppableEvent) => {
    e.preventDefault();
    // An optimization to prevent a bunch of React churn.
    if (activeDropTarget?.id !== value?.id && onDrop) {
      const draggingIndex = reorderableGroup.findIndex((i) => i.id === dragging?.id);
      if (!dragging || draggingIndex === -1) {
        return;
      }

      const droppingIndex = currentIndex;
      if (draggingIndex === droppingIndex) {
        reorderDispatch({ type: 'reset' });
      }

      reorderDispatch({
        type: 'setReorderedItems',
        payload: { draggingIndex, droppingIndex, items: reorderableGroup },
      });
      dndDispatch({
        type: 'selectDropTarget',
        payload: {
          dropTarget: { ...value, dropType: 'reorder', onDrop },
          dragging,
        },
      });
    }
  };

  const onReorderableDrop = (e: DroppableEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onDrop && dragging) {
      onDrop(dragging, 'reorder');
      // setTimeout ensures it will run after dragEnd messaging
      setTimeout(() => {
        dndDispatch({
          type: 'dropToTarget',
          payload: {
            dragging,
            dropTarget: { ...value, dropType: 'reorder', onDrop },
          },
        });
      });
    }
    dndDispatch({ type: 'resetState' });
  };

  return (
    <div>
      <div
        style={
          reorderedItems.some((i) => i.id === value.id)
            ? {
                transform: `translateY(${direction}${draggingHeight}px)`,
              }
            : undefined
        }
        ref={heightRef}
        data-test-subj={`${dataTestSubjPrefix}-translatableDrop`}
        className="domDragDrop-translatableDrop domDragDrop-reorderable"
      >
        <DropsInner {...props} />
      </div>

      <div
        data-test-subj={`${dataTestSubjPrefix}-reorderableDropLayer`}
        className={classNames('domDragDrop', {
          ['domDragDrop__reorderableDrop']: dragging,
        })}
        onDrop={onReorderableDrop}
        onDragOver={onReorderableDragOver}
        onDragLeave={() => {
          dndDispatch({ type: 'leaveDropTarget' });
          reorderDispatch({ type: 'reset' });
        }}
      />
    </div>
  );
});
