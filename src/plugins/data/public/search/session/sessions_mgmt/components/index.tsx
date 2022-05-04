/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiLinkProps, EuiText, EuiTextProps } from '@elastic/eui';
import React from 'react';
import extendSessionIcon from '../icons/extend_session.svg';

export type { OnActionComplete } from './actions';
export { PopoverActionsMenu } from './actions';

export const TableText = ({ children, ...props }: EuiTextProps) => {
  return (
    <EuiText size="m" {...props}>
      {children}
    </EuiText>
  );
};

export interface IClickActionDescriptor {
  label: React.ReactNode;
  iconType: 'trash' | 'cancel' | typeof extendSessionIcon;
  onClick: () => Promise<void> | void;
}

export interface IHrefActionDescriptor {
  label: string;
  props: EuiLinkProps;
}

export interface StatusDef {
  textColor?: EuiTextProps['color'];
  icon?: React.ReactElement;
  label: React.ReactElement;
  toolTipContent: string;
}
