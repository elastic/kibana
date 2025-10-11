/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';
import { css } from '@emotion/react';

import type { EuiPanelProps } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  euiScrollBarStyles,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';

import { styles } from './workspace_sidebar_panel.styles';

export interface WorkspaceSidebarPanelComponentProps
  extends Pick<EuiPanelProps, 'color' | 'hasShadow' | 'hasBorder'> {
  title: string;
  onClose: () => void;
  children?: ReactNode;
  isScrollable?: boolean;
  containerPadding?: 'none' | 's' | 'm' | 'l';
  isRight?: boolean;
}

export const WorkspaceSidebarPanelComponent = ({
  children,
  title,
  onClose,
  isScrollable = true,
  containerPadding = 's',
}: WorkspaceSidebarPanelComponentProps) => {
  const theme = useEuiTheme();
  const scrolling = euiScrollBarStyles(theme);
  const { euiTheme } = theme;
  const shadow = useEuiShadow('s');

  const containerStyle = css`
    ${styles.container}
    padding: ${containerPadding === 'none' ? '0' : euiTheme.size[containerPadding]};
    ${isScrollable ? scrolling : ''}
    ${isScrollable ? 'overflow-y: auto;' : ''}
    ${shadow}
  `;

  const panelStyle = css`
    ${styles.root(theme)}
  `;

  return (
    <EuiPanel
      paddingSize="none"
      color="transparent"
      css={panelStyle}
      hasBorder={false}
      hasShadow={false}
    >
      <EuiFlexGroup css={styles.header}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon iconType="cross" onClick={onClose} aria-label="Close toolbar" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiPanel css={containerStyle} borderRadius="m">
        {children}
      </EuiPanel>
    </EuiPanel>
  );
};
