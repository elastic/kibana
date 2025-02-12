/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode } from 'react';

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  euiScrollBarStyles,
  useEuiTheme,
} from '@elastic/eui';
import { styles } from './workspace_tool.styles';

export interface WorkspaceToolComponentProps {
  title: string;
  onClose: () => void;
  children?: ReactNode;
}

export const WorkspaceToolComponent = ({
  children,
  title,
  onClose,
}: WorkspaceToolComponentProps) => {
  const euiTheme = useEuiTheme();
  const scrolling = euiScrollBarStyles(euiTheme);

  return (
    <aside css={styles.root}>
      <EuiPanel hasShadow={false} paddingSize="none" css={styles.panel} color="transparent">
        <EuiFlexGroup css={styles.header}>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>{title}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon iconType="cross" onClick={onClose} aria-label="Close toolbox" />
          </EuiFlexItem>
        </EuiFlexGroup>
        <div css={styles.container(euiTheme, scrolling)}>{children}</div>
      </EuiPanel>
    </aside>
  );
};
