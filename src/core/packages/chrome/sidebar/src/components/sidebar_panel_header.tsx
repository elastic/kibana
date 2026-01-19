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
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';

const headerStyles = ({ euiTheme }: UseEuiTheme) => css`
  height: ${euiTheme.size.xl};
  padding: ${euiTheme.size.s};
  padding-left: ${euiTheme.size.m};
  box-sizing: content-box;
  border-bottom: ${euiTheme.border.thin};

  flex-grow: 0;
  flex-shrink: 0;
  align-items: center;
`;

/**
 * Props for the SidebarHeader compound component
 */
export interface SidebarHeaderProps {
  /**
   * Simple string title. Rendered inside an EuiTitle with h3.
   * If children are provided, this is ignored.
   */
  title?: string;
  /**
   * Custom content for the header. Overrides title if provided.
   * Use this for dynamic titles or custom header layouts.
   */
  children?: ReactNode;
  /**
   * Close handler. When provided, renders a close button.
   */
  onClose?: () => void;
  /**
   * Additional action buttons rendered before the close button.
   */
  actions?: ReactNode;
}

/**
 * Styled header component for sidebar apps.
 * Provides consistent header styling with optional title, actions, and close button.
 *
 * @example
 * // Simple usage with title
 * <SidebarHeader title="My App" onClose={onClose} />
 *
 * @example
 * // With actions
 * <SidebarHeader
 *   title="My App"
 *   onClose={onClose}
 *   actions={<EuiButtonIcon iconType="refresh" onClick={handleRefresh} />}
 * />
 *
 * @example
 * // Custom content
 * <SidebarHeader onClose={onClose}>
 *   <EuiTitle size="xs"><h3>{dynamicTitle}</h3></EuiTitle>
 * </SidebarHeader>
 */
export const SidebarHeader: FC<SidebarHeaderProps> = ({
  title,
  children,
  onClose,
  actions,
}) => {
  const titleContent = children ?? (
    <EuiTitle size="xs">
      <h3>{title}</h3>
    </EuiTitle>
  );

  return (
    <EuiFlexGroup css={headerStyles} gutterSize="s">
      <EuiFlexItem>{titleContent}</EuiFlexItem>
      {(actions || onClose) && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            {actions && <EuiFlexItem grow={false}>{actions}</EuiFlexItem>}
            {onClose && (
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="cross"
                  onClick={onClose}
                  aria-label={i18n.translate('core.ui.chrome.sidebar.closeSidebarAriaLabel', {
                    defaultMessage: 'Close Sidebar',
                  })}
                  color="text"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
