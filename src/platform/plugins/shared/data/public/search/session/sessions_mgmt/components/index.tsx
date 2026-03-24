/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiTextProps } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import React from 'react';

export type { OnActionComplete } from './table/actions';
export { PopoverActionsMenu } from './table/actions';

export const TableText = ({ children, ...props }: EuiTextProps) => {
  return (
    <EuiText size="s" {...props}>
      {children}
    </EuiText>
  );
};

export interface StatusDef {
  textColor?: EuiTextProps['color'];
  icon?: React.ReactElement;
  label: React.ReactElement;
  toolTipContent: string;
}
