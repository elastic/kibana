/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import {
  EuiButtonIcon,
  EuiFormControlLayout,
  EuiFormLabel,
  EuiFormRow,
  EuiToolTip,
} from '@elastic/eui';
import { ControlGroupContainer } from '../control_group/control_group_container';
import { useChildEmbeddable } from '../hooks/use_child_embeddable';
import { ControlStyle } from '../types';
import { ControlFrameStrings } from './control_frame_strings';

export interface ControlFrameProps {
  container: ControlGroupContainer;
  customPrepend?: JSX.Element;
  controlStyle: ControlStyle;
  enableActions?: boolean;
  onRemove?: () => void;
  embeddableId: string;
  onEdit?: () => void;
}

export const ControlFrame = ({
  customPrepend,
  enableActions,
  embeddableId,
  controlStyle,
  container,
  onRemove,
  onEdit,
}: ControlFrameProps) => {
  const embeddableRoot: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);
  const embeddable = useChildEmbeddable({ container, embeddableId });

  const [title, setTitle] = useState<string>();

  const usingTwoLineLayout = controlStyle === 'twoLine';

  useEffect(() => {
    if (embeddableRoot.current && embeddable) {
      embeddable.render(embeddableRoot.current);
    }
    const subscription = embeddable?.getInput$().subscribe((newInput) => setTitle(newInput.title));
    return () => subscription?.unsubscribe();
  }, [embeddable, embeddableRoot]);

  const floatingActions = (
    <div
      className={classNames('controlFrame--floatingActions', {
        'controlFrame--floatingActions-twoLine': usingTwoLineLayout,
        'controlFrame--floatingActions-oneLine': !usingTwoLineLayout,
      })}
    >
      <EuiToolTip content={ControlFrameStrings.floatingActions.getEditButtonTitle()}>
        <EuiButtonIcon
          aria-label={ControlFrameStrings.floatingActions.getEditButtonTitle()}
          iconType="pencil"
          onClick={onEdit}
          color="text"
        />
      </EuiToolTip>
      <EuiToolTip content={ControlFrameStrings.floatingActions.getRemoveButtonTitle()}>
        <EuiButtonIcon
          aria-label={ControlFrameStrings.floatingActions.getRemoveButtonTitle()}
          onClick={onRemove}
          iconType="cross"
          color="danger"
        />
      </EuiToolTip>
    </div>
  );

  const form = (
    <EuiFormControlLayout
      className={'controlFrame--formControlLayout'}
      fullWidth
      prepend={
        <>
          {customPrepend ?? null}
          {usingTwoLineLayout ? undefined : (
            <EuiFormLabel className="controlFrame--formControlLayout__label" htmlFor={embeddableId}>
              {title}
            </EuiFormLabel>
          )}
        </>
      }
    >
      <div
        className={classNames('controlFrame--control', {
          'controlFrame--twoLine': controlStyle === 'twoLine',
          'controlFrame--oneLine': controlStyle === 'oneLine',
        })}
        id={`controlFrame--${embeddableId}`}
        ref={embeddableRoot}
      />
    </EuiFormControlLayout>
  );

  return (
    <>
      {enableActions && floatingActions}
      <EuiFormRow fullWidth label={usingTwoLineLayout ? title : undefined}>
        {form}
      </EuiFormRow>
    </>
  );
};
