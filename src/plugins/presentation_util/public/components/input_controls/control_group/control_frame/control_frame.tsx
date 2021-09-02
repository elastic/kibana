/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { forwardRef, HTMLAttributes, useMemo } from 'react';
import useMount from 'react-use/lib/useMount';
import classNames from 'classnames';
import {
  EuiButtonIcon,
  EuiFlexItem,
  EuiFormControlLayout,
  EuiFormLabel,
  EuiFormRow,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';

import { OptionsListEmbeddable } from '../../control_types/options_list';
import { ControlStyle, ControlWidth } from '../control_group_component';
import { ControlGroupStrings } from '../control_group_strings';

interface DragInfo {
  isOver?: boolean;
  isClone?: boolean;
  isDragging?: boolean;
  dragActive?: boolean;
}

export interface ControlFrameProps extends HTMLAttributes<HTMLButtonElement> {
  onEdit?: () => void;
  width?: ControlWidth;
  controlStyle: ControlStyle;
  embeddable: OptionsListEmbeddable;
}

export type DraggableControlFrameProps = ControlFrameProps & { dragInfo: DragInfo };

export const ControlFrame = forwardRef<HTMLButtonElement, DraggableControlFrameProps>(
  (
    { dragInfo, style, embeddable, controlStyle, onEdit, width, ...dragHandleProps },
    dragHandleRef
  ) => {
    const embeddableRoot: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);

    const { isOver, isClone, isDragging, dragActive } = dragInfo;

    useMount(() => {
      if (!isClone && embeddableRoot.current && embeddable)
        embeddable.render(embeddableRoot.current);
    });

    const usingTwoLineLayout = !isClone && controlStyle === 'twoLine';

    const floatingActions = (
      <div
        className={classNames('controlFrame--floatingActions', {
          'controlFrame--floatingActions-twoLine': usingTwoLineLayout,
          'controlFrame--floatingActions-oneLine': !usingTwoLineLayout,
        })}
      >
        <EuiToolTip content={ControlGroupStrings.floatingActions.getEditButtonTitle()}>
          <EuiButtonIcon
            aria-label={ControlGroupStrings.floatingActions.getEditButtonTitle()}
            iconType="pencil"
            onClick={onEdit}
            color="text"
          />
        </EuiToolTip>
        <EuiToolTip content={ControlGroupStrings.floatingActions.getRemoveButtonTitle()}>
          <EuiButtonIcon
            aria-label={ControlGroupStrings.floatingActions.getRemoveButtonTitle()}
            iconType="cross"
            color="danger"
          />
        </EuiToolTip>
      </div>
    );

    const form = (
      <EuiFormControlLayout
        className={classNames('controlFrame--formControlLayout', {
          'controlFrame--formControlLayout-isDragging': isDragging,
          'controlFrame--formControlLayout-clone': isClone,
          'controlFrame--formControlLayout-over': isOver,
        })}
        fullWidth
        prepend={
          <>
            <button ref={dragHandleRef} {...dragHandleProps} className="controlFrame--dragHandle">
              <EuiIcon type="grabHorizontal" />
            </button>
            {usingTwoLineLayout ? undefined : (
              <EuiFormLabel
                className={classNames({
                  'controlFrame--formControlLayout-isDragging': isDragging,
                })}
                htmlFor={embeddable.id}
              >
                {embeddable.getInput().title}
              </EuiFormLabel>
            )}
          </>
        }
      >
        <div
          className={classNames('controlFrame--control', {
            'controlFrame--control-isDragging': isDragging,
            'controlFrame--twoLine': controlStyle === 'twoLine',
            'controlFrame--oneLine': controlStyle === 'oneLine',
          })}
          id={embeddable.id}
          ref={embeddableRoot}
        />
      </EuiFormControlLayout>
    );

    return (
      <EuiFlexItem
        grow={width === 'auto'}
        className={classNames({
          'controlFrame--wrapper': !isClone,
          'controlFrame--cloneWrapper': isClone,
          'controlFrame--wrapper-small': width === 'small',
          'controlFrame--wrapper-medium': width === 'medium',
          'controlFrame--wrapper-large': width === 'large',
        })}
        style={style}
      >
        <>
          {!isClone && !dragActive && floatingActions}
          <EuiFormRow
            fullWidth
            label={usingTwoLineLayout ? embeddable.getInput().title : undefined}
          >
            {form}
          </EuiFormRow>
        </>
      </EuiFlexItem>
    );
  }
);
