/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexItem, EuiFormLabel, EuiIcon, EuiFlexGroup } from '@elastic/eui';
import React, { forwardRef, HTMLAttributes } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import classNames from 'classnames';

import { ControlGroupInput } from '../types';
import { ControlFrame, ControlFrameProps } from './control_frame_component';
import { useReduxContainerContext } from '../../../redux_embeddables/redux_embeddable_context';

interface DragInfo {
  isOver?: boolean;
  isDragging?: boolean;
  draggingIndex?: number;
  index?: number;
}

export type SortableControlProps = ControlFrameProps & {
  dragInfo: DragInfo;
};

/**
 * A sortable wrapper around the generic control frame.
 */
export const SortableControl = (frameProps: SortableControlProps) => {
  const { embeddableId } = frameProps;
  const { over, listeners, isSorting, transform, transition, attributes, isDragging, setNodeRef } =
    useSortable({
      id: embeddableId,
      animateLayoutChanges: () => true,
    });

  frameProps.dragInfo = { ...frameProps.dragInfo, isOver: over?.id === embeddableId, isDragging };

  return (
    <SortableControlInner
      key={embeddableId}
      ref={setNodeRef}
      {...frameProps}
      {...attributes}
      {...listeners}
      style={{
        transition: transition ?? undefined,
        transform: isSorting ? undefined : CSS.Translate.toString(transform),
      }}
    />
  );
};

const SortableControlInner = forwardRef<
  HTMLButtonElement,
  SortableControlProps & { style: HTMLAttributes<HTMLButtonElement>['style'] }
>(({ embeddableId, dragInfo, style, ...dragHandleProps }, dragHandleRef) => {
  const { isOver, isDragging, draggingIndex, index } = dragInfo;
  const { useEmbeddableSelector } = useReduxContainerContext<ControlGroupInput>();
  const { panels } = useEmbeddableSelector((state) => state);

  const width = panels[embeddableId].width;

  const dragHandle = (
    <button ref={dragHandleRef} {...dragHandleProps} className="controlFrame--dragHandle">
      <EuiIcon type="grabHorizontal" />
    </button>
  );

  return (
    <EuiFlexItem
      grow={width === 'auto'}
      className={classNames('controlFrame--wrapper', {
        'controlFrame--wrapper-isDragging': isDragging,
        'controlFrame--wrapper-small': width === 'small',
        'controlFrame--wrapper-medium': width === 'medium',
        'controlFrame--wrapper-large': width === 'large',
        'controlFrame--wrapper-insertBefore': isOver && (index ?? -1) < (draggingIndex ?? -1),
        'controlFrame--wrapper-insertAfter': isOver && (index ?? -1) > (draggingIndex ?? -1),
      })}
      style={style}
    >
      <ControlFrame
        enableActions={draggingIndex === -1}
        embeddableId={embeddableId}
        customPrepend={dragHandle}
      />
    </EuiFlexItem>
  );
});

/**
 * A simplified clone version of the control which is dragged. This version only shows
 * the title, because individual controls can be any size, and dragging a wide item
 * can be quite cumbersome.
 */
export const ControlClone = ({ draggingId }: { draggingId: string }) => {
  const { useEmbeddableSelector } = useReduxContainerContext<ControlGroupInput>();
  const { panels, controlStyle } = useEmbeddableSelector((state) => state);

  const width = panels[draggingId].width;
  const title = panels[draggingId].explicitInput.title;
  return (
    <EuiFlexItem
      className={classNames('controlFrame--cloneWrapper', {
        'controlFrame--cloneWrapper-small': width === 'small',
        'controlFrame--cloneWrapper-medium': width === 'medium',
        'controlFrame--cloneWrapper-large': width === 'large',
        'controlFrame--cloneWrapper-twoLine': controlStyle === 'twoLine',
      })}
    >
      {controlStyle === 'twoLine' ? <EuiFormLabel>{title}</EuiFormLabel> : undefined}
      <EuiFlexGroup gutterSize="none" className={'controlFrame--draggable'}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="grabHorizontal" className="controlFrame--dragHandle" />
        </EuiFlexItem>
        {controlStyle === 'oneLine' ? <EuiFlexItem>{title}</EuiFlexItem> : undefined}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
