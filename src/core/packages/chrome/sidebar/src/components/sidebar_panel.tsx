/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, ReactNode } from 'react';
import React from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  euiScrollBarStyles,
  EuiTitle,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

const panelContainerStyles = ({ euiTheme }: UseEuiTheme) =>
  css`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    margin-right: ${euiTheme.size.s};
    margin-bottom: ${euiTheme.size.s};
  `;

const headerStyles = ({ euiTheme }: UseEuiTheme) => css`
  margin: ${euiTheme.size.s} 0 ${euiTheme.size.s} ${euiTheme.size.s};
  height: ${euiTheme.size.xl};
  flex-grow: 0;
  align-items: center;
`;

const scrollableContentStyles = (theme: UseEuiTheme, shadow: string) => {
  const { euiTheme } = theme;
  const scrolling = euiScrollBarStyles(theme);

  return css`
    ${scrolling};
    flex-grow: 1;
    padding: ${euiTheme.size.m};
    ${shadow}
  `;
};

export const SidebarPanel: FC<{ children: ReactNode; title: string; onClose: () => void }> = ({
  children,
  title,
  onClose,
}) => {
  const theme = useEuiTheme();
  const shadow = useEuiShadow('s');

  return (
    <EuiPanel
      paddingSize="none"
      color="transparent"
      css={panelContainerStyles(theme)}
      hasBorder={false}
      hasShadow={false}
    >
      <EuiFlexGroup css={headerStyles(theme)}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem>
              <EuiButtonIcon
                iconType={'fullScreen'}
                onClick={() => {}}
                aria-label="Full screen"
                color="text"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButtonIcon
                iconType="cross"
                onClick={onClose}
                aria-label="Close Sidebar"
                color="text"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiPanel css={scrollableContentStyles(theme, shadow)} borderRadius="m">
        {children}
      </EuiPanel>
    </EuiPanel>
  );
};
