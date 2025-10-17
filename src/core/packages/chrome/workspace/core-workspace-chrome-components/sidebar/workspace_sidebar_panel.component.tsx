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
import { ResizableButton } from './resizable_button.component';

export interface WorkspaceSidebarPanelComponentProps
  extends Pick<EuiPanelProps, 'color' | 'hasShadow' | 'hasBorder'> {
  title: string;
  onClose: () => void;
  children?: ReactNode;
  isScrollable?: boolean;
  containerPadding?: 'none' | 's' | 'm' | 'l';
  isRight?: boolean;
  isFullSize?: boolean;
  onSetFullSize: (isFullSize: boolean) => void;
  onResize?: (delta: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

export const WorkspaceSidebarPanelComponent = ({
  children,
  title,
  onClose,
  onSetFullSize,
  onResize,
  onResizeStart,
  onResizeEnd,
  isFullSize = false,
  isScrollable = true,
  containerPadding = 'm',
}: WorkspaceSidebarPanelComponentProps) => {
  const theme = useEuiTheme();
  const scrolling = euiScrollBarStyles(theme);
  const { euiTheme } = theme;
  const shadow = useEuiShadow('s');

  const scrollableStyle = css`
    ${scrolling}
    overflow-y: auto;
  `;

  const containerStyle = css`
    ${styles.container}
    height: calc(100vh - ${euiTheme.size.xl} - 24px);
    padding: ${containerPadding === 'none' ? '0' : euiTheme.size[containerPadding]};
    ${isScrollable ? scrollableStyle : ''}
    ${shadow}
  `;

  const panelStyle = css`
    ${styles.root(theme)}
    ${isFullSize ? styles.fullScreenRoot : ''}
  `;

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="none"
      css={css`
        width: 100%;
      `}
    >
      <EuiFlexItem grow={false}>
        <ResizableButton
          isHorizontal={true}
          onResize={onResize}
          onResizeStart={onResizeStart}
          onResizeEnd={onResizeEnd}
          css={css`
            margin-inline: ${isFullSize ? '-8px' : '-12px'};
          `}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <EuiPanel
          paddingSize="none"
          color="transparent"
          css={panelStyle}
          hasBorder={false}
          hasShadow={false}
        >
          <EuiFlexGroup
            css={[
              styles.header,
              isFullSize
                ? css`
                    margin-left: ${euiTheme.size.m};
                  `
                : '',
            ]}
          >
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3>{title}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs">
                <EuiFlexItem>
                  <EuiButtonIcon iconType="boxesVertical" onClick={() => {}} aria-label="More" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButtonIcon
                    iconType={isFullSize ? 'fullScreenExit' : 'fullScreen'}
                    onClick={() => onSetFullSize(!isFullSize)}
                    aria-label="Full screen"
                    color="text"
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButtonIcon iconType="cross" onClick={onClose} aria-label="Close toolbar" />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiPanel css={containerStyle} borderRadius="m">
            {children}
          </EuiPanel>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
