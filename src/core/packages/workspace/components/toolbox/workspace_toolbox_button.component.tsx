/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonIcon, type EuiButtonIconPropsForButton } from '@elastic/eui';

export interface WorkspaceToolboxButtonComponentProps
  extends Pick<EuiButtonIconPropsForButton, 'iconType' | 'onClick'> {
  isOpen?: boolean;
  'aria-label'?: string;
}

export const WorkspaceToolboxButtonComponent = ({
  iconType,
  isOpen: isSelected,
  ...props
}: WorkspaceToolboxButtonComponentProps) => {
  const color = isSelected ? 'primary' : 'text';
  const display = isSelected ? 'base' : 'empty';

  return <EuiButtonIcon size="s" {...{ iconType, color, display, isSelected, ...props }} />;
};
