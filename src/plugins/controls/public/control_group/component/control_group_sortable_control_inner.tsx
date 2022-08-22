/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React, { forwardRef, HTMLAttributes } from 'react';

import { EuiFlexItem, EuiIcon } from '@elastic/eui';
import { useReduxContainerContext } from '@kbn/presentation-util-plugin/public';

import { ControlGroupStrings } from '../control_group_strings';
import { ControlGroupReduxState } from '../types';
import { ControlFrame } from './control_frame_component';
import { SortableControlProps } from './control_group_sortable_control';

export const SortableControlInner = forwardRef<
  HTMLButtonElement,
  SortableControlProps & { style: HTMLAttributes<HTMLButtonElement>['style'] }
>(
  (
    { dragInfo, embeddableId, embeddableType, isEditable, style, ...dragHandleProps },
    dragHandleRef
  ) => {
    const { draggingIndex, index, isDragging, isOver } = dragInfo;
    const { useEmbeddableSelector } = useReduxContainerContext<ControlGroupReduxState>();
    const panels = useEmbeddableSelector((state) => state.explicitInput.panels);

    const grow = panels[embeddableId].grow;
    const title = panels[embeddableId].explicitInput.title;
    const width = panels[embeddableId].width;

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
        className={classNames('controlFrameWrapper', {
          'controlFrameWrapper-isDragging': isDragging,
          'controlFrameWrapper-isEditable': isEditable,
          'controlFrameWrapper--small': width === 'small',
          'controlFrameWrapper--medium': width === 'medium',
          'controlFrameWrapper--large': width === 'large',
          'controlFrameWrapper--insertBefore': isOver && (index ?? -1) < (draggingIndex ?? -1),
          'controlFrameWrapper--insertAfter': isOver && (index ?? -1) > (draggingIndex ?? -1),
        })}
        data-control-id={embeddableId}
        data-render-complete="true"
        data-test-subj={`control-frame`}
        grow={grow}
        style={style}
      >
        <ControlFrame
          customPrepend={isEditable ? dragHandle : undefined}
          embeddableId={embeddableId}
          embeddableType={embeddableType}
          enableActions={isEditable && draggingIndex === -1}
        />
      </EuiFlexItem>
    );
  }
);
