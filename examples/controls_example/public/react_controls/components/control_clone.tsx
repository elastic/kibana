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
import {
  useBatchedOptionalPublishingSubjects,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';

import { DefaultControlApi } from '../types';

/**
 * A simplified clone version of the control which is dragged. This version only shows
 * the title, because individual controls can be any size, and dragging a wide item
 * can be quite cumbersome.
 */
export const ControlClone = ({
  controlStyle,
  controlApi,
}: {
  controlStyle: string;
  controlApi: DefaultControlApi;
}) => {
  const width = useStateFromPublishingSubject(controlApi.width);
  const [panelTitle, defaultPanelTitle] = useBatchedOptionalPublishingSubjects(
    controlApi.panelTitle,
    controlApi.defaultPanelTitle
  );

  return (
    <EuiFlexItem
      className={classNames('controlFrameCloneWrapper', {
        'controlFrameCloneWrapper--small': width === 'small',
        'controlFrameCloneWrapper--medium': width === 'medium',
        'controlFrameCloneWrapper--large': width === 'large',
        'controlFrameCloneWrapper--twoLine': controlStyle === 'twoLine',
      })}
    >
      {controlStyle === 'twoLine' ? (
        <EuiFormLabel>{panelTitle ?? defaultPanelTitle}</EuiFormLabel>
      ) : undefined}
      <EuiFlexGroup responsive={false} gutterSize="none" className={'controlFrame__draggable'}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="grabHorizontal" className="controlFrame__dragHandle" />
        </EuiFlexItem>
        {controlStyle === 'oneLine' ? (
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
