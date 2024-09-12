/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIcon, EuiKeyPadMenuItem, type EuiIconProps } from '@elastic/eui';
import { ProjectType } from '@kbn/serverless-types';

import { labels, icons } from './constants';

type OnChangeType = (id: string, value?: any) => void;

interface ItemProps extends Pick<EuiIconProps, 'type'> {
  type: ProjectType;
  onChange: (type: ProjectType) => void;
  isSelected: boolean;
}

export const SwitcherItem = ({ type: id, onChange, isSelected }: ItemProps) => (
  <EuiKeyPadMenuItem
    checkable="single"
    name="projectSelection"
    label={labels[id]}
    onChange={onChange as OnChangeType}
    {...{ isSelected, id }}
  >
    <EuiIcon type={icons[id]} size="l" />
  </EuiKeyPadMenuItem>
);
