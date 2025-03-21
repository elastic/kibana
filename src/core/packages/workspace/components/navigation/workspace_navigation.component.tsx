/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode } from 'react';
import { EuiCollapsibleNavBeta, type EuiCollapsibleNavBetaProps } from '@elastic/eui';

import { styles } from './workspace_navigation.styles';
export interface WorkspaceNavigationComponentProps
  extends Pick<EuiCollapsibleNavBetaProps, 'onCollapseToggle' | 'isCollapsed'> {
  children: ReactNode;
}

export const WorkspaceNavigationComponent = ({
  children,
  isCollapsed,
}: WorkspaceNavigationComponentProps) => (
  <div css={styles.root}>
    <EuiCollapsibleNavBeta {...{ isCollapsed }} css={styles.content}>
      {children}
    </EuiCollapsibleNavBeta>
  </div>
);
