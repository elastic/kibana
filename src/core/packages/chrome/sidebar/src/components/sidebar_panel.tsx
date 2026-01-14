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
import { i18n } from '@kbn/i18n';
import { getHighContrastBorder } from '@kbn/core-chrome-layout-utils';
import { useLayoutConfig } from '@kbn/core-chrome-layout-components';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  euiOverflowScroll,
  euiShadow,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { PanelResizeHandle } from './panel_resize_handle';

const sidebarWrapperStyles = (theme: UseEuiTheme) => css`
  display: flex;
  flex-direction: row;
  height: 100%;
  width: 100%;
`;

const panelContainerStyles = (isProjectStyle: boolean) => (theme: UseEuiTheme) =>
  css`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    min-width: 0; // Allow panel to shrink

    ${isProjectStyle &&
    css`
      border-radius: ${theme.euiTheme.border.radius.medium};
      border: ${getHighContrastBorder(theme)};
      ${euiShadow(theme, 'xs', { border: 'none' })};
    `}
  `;

const headerStyles = ({ euiTheme }: UseEuiTheme) => css`
  height: ${euiTheme.size.xl};
  padding: ${euiTheme.size.s};
  padding-left: ${euiTheme.size.m};
  box-sizing: content-box;
  border-bottom: ${euiTheme.border.thin};

  flex-grow: 0;
  align-items: center;
`;

const scrollableContentStyles = (theme: UseEuiTheme) => {
  const { euiTheme } = theme;

  return css`
    ${euiOverflowScroll(theme, { direction: 'y' })};
    padding: ${euiTheme.size.m};
    flex-grow: 1;
  `;
};

export interface SidebarPanelProps {
  children: ReactNode;
  title: string;
  onClose: () => void;
}

export const SidebarPanel: FC<SidebarPanelProps> = ({ children, title, onClose }) => {
  // TODO: Replace with context from Chrome when available
  const { chromeStyle } = useLayoutConfig();
  return (
    <div css={sidebarWrapperStyles}>
      <PanelResizeHandle />
      <EuiPanel
        paddingSize="none"
        css={panelContainerStyles(chromeStyle === 'project')}
        hasBorder={false}
        hasShadow={false}
        borderRadius={'none'}
      >
        <EuiFlexGroup css={headerStyles}>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>{title}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem>
                <EuiButtonIcon
                  iconType="cross"
                  onClick={onClose}
                  aria-label={i18n.translate('core.ui.chrome.sidebar.closeSidebarAriaLabel', {
                    defaultMessage: 'Close Sidebar',
                  })}
                  color="text"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiPanel css={scrollableContentStyles} hasShadow={false} paddingSize={'none'}>
          {children}
        </EuiPanel>
      </EuiPanel>
    </div>
  );
};
