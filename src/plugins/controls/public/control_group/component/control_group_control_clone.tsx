/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiFormLabel, EuiIcon } from '@elastic/eui';
import { useReduxContainerContext } from '@kbn/presentation-util-plugin/public';

import { ControlGroupReduxState } from '../types';

/**
 * A simplified clone version of the control which is dragged. This version only shows
 * the title, because individual controls can be any size, and dragging a wide item
 * can be quite cumbersome.
 */
export const ControlClone = ({ draggingId }: { draggingId: string }) => {
  const { useEmbeddableSelector: select } = useReduxContainerContext<ControlGroupReduxState>();
  const panels = select((state) => state.explicitInput.panels);
  const controlStyle = select((state) => state.explicitInput.controlStyle);

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
      <EuiFlexGroup gutterSize="none" className={'controlFrame__draggable'} responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon className="controlFrame__dragHandle" type="grabHorizontal" />
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
