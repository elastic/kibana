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
  EuiPanelProps,
  EuiTitle,
  euiScrollBarStyles,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { styles } from './workspace_tool.styles';

export interface WorkspaceToolComponentProps
  extends Pick<EuiPanelProps, 'color' | 'hasShadow' | 'hasBorder'> {
  title: string;
  onClose: () => void;
  children?: ReactNode;
  isScrollable?: boolean;
  containerPadding?: 'none' | 's' | 'm' | 'l';
}

export const WorkspaceToolComponent = ({
  children,
  title,
  onClose,
  isScrollable = true,
  hasShadow = false,
  hasBorder = false,
  color = 'transparent',
  containerPadding = 's',
}: WorkspaceToolComponentProps) => {
  const euiTheme = useEuiTheme();
  const scrolling = euiScrollBarStyles(euiTheme);

  const containerStyle = css`
    ${styles.container}
    padding: ${containerPadding === 'none' ? '0' : euiTheme.euiTheme.size[containerPadding]};
    ${isScrollable ? scrolling : ''}
    ${isScrollable ? 'overflow-y: auto;' : ''}
  `;

  return (
    <aside css={styles.root}>
      <EuiPanel paddingSize="none" css={styles.panel} {...{ hasShadow, color, hasBorder }}>
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
        <div css={containerStyle}>{children}</div>
      </EuiPanel>
    </aside>
  );
};
