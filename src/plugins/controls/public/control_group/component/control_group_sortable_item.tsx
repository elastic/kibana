/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import React, { forwardRef, HTMLAttributes } from 'react';
import { EuiFlexItem, EuiFormLabel, EuiIcon, EuiFlexGroup } from '@elastic/eui';

import { ControlGroupStrings } from '../control_group_strings';
import { ControlFrame, ControlFrameProps } from './control_frame_component';
import { controlGroupSelector } from '../embeddable/control_group_container';

interface DragInfo {
  isOver?: boolean;
  isDragging?: boolean;
  draggingIndex?: number;
  index?: number;
}

export type SortableControlProps = ControlFrameProps & {
  dragInfo: DragInfo;
  isEditable: boolean;
};

/**
 * A sortable wrapper around the generic control frame.
 */
export const SortableControl = (frameProps: SortableControlProps) => {
  const { embeddableId, isEditable } = frameProps;
  const { over, listeners, isSorting, transform, transition, attributes, isDragging, setNodeRef } =
    useSortable({
      id: embeddableId,
      animateLayoutChanges: () => true,
      disabled: !isEditable,
    });

  const sortableFrameProps = {
    ...frameProps,
    dragInfo: { ...frameProps.dragInfo, isOver: over?.id === embeddableId, isDragging },
  };

  return (
    <SortableControlInner
      key={embeddableId}
      ref={setNodeRef}
      {...sortableFrameProps}
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
>(
  (
    { embeddableId, embeddableType, dragInfo, style, isEditable, ...dragHandleProps },
    dragHandleRef
  ) => {
    const { isOver, isDragging, draggingIndex, index } = dragInfo;
    const panels = controlGroupSelector((state) => state.explicitInput.panels);

    const grow = panels[embeddableId].grow;
    const width = panels[embeddableId].width;
    const title = panels[embeddableId].explicitInput.title;

    const dragHandle = (
      <button
        ref={dragHandleRef}
        {...dragHandleProps}
        aria-label={`${ControlGroupStrings.ariaActions.getMoveControlButtonAction(title)}`}
        className="controlFrame__dragHandle"
      >
        <EuiIcon type="grabHorizontal" />
      </button>
    );

    return (
      <EuiFlexItem
        grow={grow}
        data-control-id={embeddableId}
        data-test-subj={`control-frame`}
        data-render-complete="true"
        className={classNames('controlFrameWrapper', {
          'controlFrameWrapper--grow': grow,
          'controlFrameWrapper-isDragging': isDragging,
          'controlFrameWrapper-isEditable': isEditable,
          'controlFrameWrapper--small': width === 'small',
          'controlFrameWrapper--medium': width === 'medium',
          'controlFrameWrapper--large': width === 'large',
          'controlFrameWrapper--insertBefore': isOver && (index ?? -1) < (draggingIndex ?? -1),
          'controlFrameWrapper--insertAfter': isOver && (index ?? -1) > (draggingIndex ?? -1),
        })}
        style={style}
      >
        <ControlFrame
          enableActions={draggingIndex === -1}
          embeddableId={embeddableId}
          embeddableType={embeddableType}
          customPrepend={isEditable ? dragHandle : undefined}
        />
      </EuiFlexItem>
    );
  }
);

/**
 * A simplified clone version of the control which is dragged. This version only shows
 * the title, because individual controls can be any size, and dragging a wide item
 * can be quite cumbersome.
 */
export const ControlClone = ({ draggingId }: { draggingId: string }) => {
  const panels = controlGroupSelector((state) => state.explicitInput.panels);
  const controlStyle = controlGroupSelector((state) => state.explicitInput.controlStyle);

  const width = panels[draggingId].width;
  const title = panels[draggingId].explicitInput.title;
  return (
    <EuiFlexItem
      className={classNames('controlFrameCloneWrapper', {
        'controlFrameCloneWrapper--small': width === 'small',
        'controlFrameCloneWrapper--medium': width === 'medium',
        'controlFrameCloneWrapper--large': width === 'large',
        'controlFrameCloneWrapper--twoLine': controlStyle === 'twoLine',
      })}
    >
      {controlStyle === 'twoLine' ? <EuiFormLabel>{title}</EuiFormLabel> : undefined}
      <EuiFlexGroup responsive={false} gutterSize="none" className={'controlFrame__draggable'}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="grabHorizontal" className="controlFrame__dragHandle" />
        </EuiFlexItem>
        {controlStyle === 'oneLine' ? (
          <EuiFlexItem>
            <label className="controlFrameCloneWrapper__label">{title}</label>
          </EuiFlexItem>
        ) : undefined}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
