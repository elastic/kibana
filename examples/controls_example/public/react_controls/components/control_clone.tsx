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
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { DEFAULT_CONTROL_GROW } from '@kbn/controls-plugin/common';

import { BehaviorSubject } from 'rxjs';
import { DefaultControlApi } from '../types';

/**
 * A simplified clone version of the control which is dragged. This version only shows
 * the title, because individual controls can be any size, and dragging a wide item
 * can be quite cumbersome.
 */
export const ControlClone = ({
  labelPosition,
  controlApi,
}: {
  labelPosition: string;
  controlApi: DefaultControlApi | undefined;
}) => {
  const [width, panelTitle, defaultPanelTitle] = useBatchedPublishingSubjects(
    controlApi ? controlApi.width : new BehaviorSubject(DEFAULT_CONTROL_GROW),
    controlApi?.panelTitle ? controlApi.panelTitle : new BehaviorSubject(undefined),
    controlApi?.defaultPanelTitle ? controlApi.defaultPanelTitle : new BehaviorSubject('')
  );

  return (
    <EuiFlexItem
      className={classNames('controlFrameCloneWrapper', {
        'controlFrameCloneWrapper--small': width === 'small',
        'controlFrameCloneWrapper--medium': width === 'medium',
        'controlFrameCloneWrapper--large': width === 'large',
        'controlFrameCloneWrapper--twoLine': labelPosition === 'twoLine',
      })}
    >
      {labelPosition === 'twoLine' ? (
        <EuiFormLabel>{panelTitle ?? defaultPanelTitle}</EuiFormLabel>
      ) : undefined}
      <EuiFlexGroup responsive={false} gutterSize="none" className={'controlFrame__draggable'}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="grabHorizontal" className="controlFrame__dragHandle" />
        </EuiFlexItem>
        {labelPosition === 'oneLine' ? (
          <EuiFlexItem>
            <label className="controlFrameCloneWrapper__label">
              {panelTitle ?? defaultPanelTitle}
            </label>
          </EuiFlexItem>
        ) : undefined}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
