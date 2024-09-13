/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext, useCallback, useEffect, memo, useState, useRef } from 'react';
import type { ReactElement } from 'react';
import classNames from 'classnames';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import useShallowCompareEffect from 'react-use/lib/useShallowCompareEffect';
import {
  DragDropIdentifier,
  ReorderContext,
  DropHandler,
  Ghost,
  DragDropAction,
  DragContextState,
  useDragDropContext,
} from './providers';
import { DropType } from './types';
import './sass/droppable.scss';

type DroppableEvent = React.DragEvent<HTMLElement>;

const noop = () => {};

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
  reorderableGroup?: Array<{ id: string }>;

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
 * The props for a non-draggable instance of that component.
 */
interface DropsInnerProps extends DroppableProps {
  dndState: DragContextState;
  dndDispatch: React.Dispatch<DragDropAction>;
}

/**
 * Droppable component
 * @param props
 * @constructor
 */
export const Droppable = (props: DroppableProps) => {
  const [dndState, dndDispatch] = useDragDropContext();

  if (props.isDisabled) {
    return props.children;
  }

  const { dropTypes, reorderableGroup } = props;

  const dropProps = {
    ...props,
    dndState,
    dndDispatch,
  };
  if (reorderableGroup && reorderableGroup.length > 1 && dropTypes?.[0] === 'reorder') {
    return <ReorderableDroppableImpl {...dropProps} reorderableGroup={reorderableGroup} />;
  }
  return <DroppableImpl {...dropProps} />;
};

const DroppableImpl = memo(function DroppableImpl(props: DropsInnerProps) {
  const {
    dataTestSubj,
    className,
    onDrop,
    value,
    children,
    dndState,
    dndDispatch,
    dropTypes,
    order,
    getAdditionalClassesOnEnter,
    getAdditionalClassesOnDroppable,
    getCustomDropTarget,
  } = props;

  const { dragging, hoveredDropTarget, dataTestSubjPrefix, keyboardMode } = dndState;

  const [isInZone, setIsInZone] = useState(false);
  const mainTargetRef = useRef<HTMLDivElement>(null);

  useShallowCompareEffect(() => {
    if (dropTypes && dropTypes?.[0] && onDrop && keyboardMode) {
      dndDispatch({
        type: 'registerDropTargets',
        payload: dropTypes.reduce(
          (acc, dropType, index) => ({
            ...acc,
            [[...order, index].join(',')]: { ...value, onDrop, dropType },
          }),
          {}
        ),
      });
    }
  }, [order, dndDispatch, dropTypes, keyboardMode]);

  useEffect(() => {
    let isMounted = true;
    if (hoveredDropTarget && hoveredDropTarget.id !== value.id) {
      setIsInZone(false);
    }
    setTimeout(() => {
      if (!hoveredDropTarget && isMounted) {
        setIsInZone(false);
      }
    }, 1000);
    return () => {
      isMounted = false;
    };
  }, [hoveredDropTarget, setIsInZone, value.id]);

  const dragEnter = useCallback(() => {
    if (!isInZone) {
      setIsInZone(true);
    }
  }, [isInZone]);

  const getModifiedDropType = useCallback(
    (e: DroppableEvent, dropType: DropType) => {
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
    },
    [dropTypes]
  );

  const dragOver = (e: DroppableEvent, dropType: DropType) => {
    e.preventDefault();
    if (!dragging || !onDrop) {
      return;
    }

    const modifiedDropType = getModifiedDropType(e, dropType);

    const isSelectedDropTarget = !!(
      hoveredDropTarget?.id === value.id && hoveredDropTarget?.dropType === modifiedDropType
    );
    // An optimization to prevent a bunch of React churn.
    if (!isSelectedDropTarget) {
      dndDispatch({
        type: 'selectDropTarget',
        payload: {
          dropTarget: { ...value, dropType: modifiedDropType, onDrop },
          dragging,
        },
      });
    }
  };

  const dragLeave = useCallback(() => {
    dndDispatch({ type: 'leaveDropTarget' });
  }, [dndDispatch]);

  const drop = useCallback(
    (e: DroppableEvent, dropType: DropType) => {
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
    },
    [dndDispatch, onDrop, dragging, getModifiedDropType, value]
  );
  const getProps = (dropType?: DropType, dropChildren?: ReactElement) => {
    const isSelectedDropTarget = Boolean(
      hoveredDropTarget?.id === value.id && dropType === hoveredDropTarget?.dropType
    );

    return {
      'data-test-subj': dataTestSubj || `${dataTestSubjPrefix}-domDroppable`,
      className: getClasses(dropType, dropChildren),
      onDragEnter: dragEnter,
      onDragLeave: dragLeave,
      onDragOver: dropType
        ? (e: DroppableEvent) => {
            dragOver(e, dropType);
          }
        : noop,
      onDrop: dropType
        ? (e: DroppableEvent) => {
            drop(e, dropType);
          }
        : noop,
      ghost:
        (isSelectedDropTarget && dropType !== 'reorder' && dragging?.ghost && dragging.ghost) ||
        undefined,
    };
  };

  const getClasses = (dropType?: DropType, dropChildren = children) => {
    const isSelectedDropTarget = Boolean(
      hoveredDropTarget?.id === value.id && dropType === hoveredDropTarget?.dropType
    );
    const classesOnDroppable = getAdditionalClassesOnDroppable?.(dropType);

    const classes = classNames(
      'domDroppable',
      {
        'domDroppable--active': dragging && dropType,
        'domDroppable--hover': dropType && isSelectedDropTarget,
        'domDroppable--notAllowed':
          dragging && (!dropTypes || !dropTypes.length) && value.id !== dragging.id,
      },
      classesOnDroppable && { [classesOnDroppable]: dragging && dropType }
    );
    return classNames(classes, className, dropChildren.props.className);
  };

  const getMainTargetClasses = () => {
    const classesOnEnter = getAdditionalClassesOnEnter?.(hoveredDropTarget?.dropType);
    return classNames(classesOnEnter && { [classesOnEnter]: hoveredDropTarget?.id === value.id });
  };

  const mainTargetProps = getProps(dropTypes && dropTypes[0]);

  return (
    <div
      data-test-subj={`${dataTestSubjPrefix}Container`}
      className={classNames('domDroppable__container', {
        'domDroppable__container-active': isInZone || hoveredDropTarget?.id === value.id,
      })}
      onDragEnter={dragEnter}
      ref={mainTargetRef}
    >
      <SingleDropInner
        {...mainTargetProps}
        className={classNames(mainTargetProps.className, getMainTargetClasses())}
      >
        {children}
      </SingleDropInner>
      {dropTypes && dropTypes.length > 1 && (
        <EuiFlexGroup
          gutterSize="none"
          direction="column"
          data-test-subj={`${dataTestSubjPrefix}ExtraTargets`}
          className={classNames('domDroppable__extraTargets', {
            'domDroppable__extraTargets-visible': isInZone || hoveredDropTarget?.id === value.id,
          })}
        >
          {dropTypes.slice(1).map((dropType) => {
            const dropChildren = getCustomDropTarget?.(dropType);
            return dropChildren ? (
              <EuiFlexItem key={dropType} className="domDroppable__extraDropWrapper">
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
            className: classNames(
              ghost.children.props.className,
              ghost.className,
              'domDraggable_ghost'
            ),
            style: ghost.style,
          })
        : null}
    </>
  );
};

const ReorderableDroppableImpl = memo(function ReorderableDroppableImpl(
  props: DropsInnerProps & { reorderableGroup: Array<{ id: string }> }
) {
  const { onDrop, value, dndState, dndDispatch, reorderableGroup, className } = props;

  const { dragging, dataTestSubjPrefix, hoveredDropTarget } = dndState;
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
    if (hoveredDropTarget?.id !== value?.id && onDrop) {
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
    <>
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
        className="domDroppable--translatable"
      >
        <DroppableImpl
          {...props}
          className={classNames(className, {
            ['domDroppable__overlayWrapper']: dragging,
          })}
        />
      </div>

      <div
        data-test-subj={`${dataTestSubjPrefix}-reorderableDropLayer`}
        className={classNames({
          ['domDroppable--reorderable']: dragging,
        })}
        onDrop={onReorderableDrop}
        onDragOver={onReorderableDragOver}
        onDragLeave={() => {
          dndDispatch({ type: 'leaveDropTarget' });
          reorderDispatch({ type: 'reset' });
        }}
      />
    </>
  );
});
