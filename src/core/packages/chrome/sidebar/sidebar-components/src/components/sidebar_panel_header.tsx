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
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useSidebarPanel } from '@kbn/core-chrome-sidebar-context';

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

const closeSidebarLabel = i18n.translate('core.ui.chrome.sidebar.closeSidebarAriaLabel', {
  defaultMessage: 'Close side panel',
});

export interface SidebarHeaderProps {
  /** Renders as heading and labels the panel via aria-labelledby. When children are provided, used only for the aria-label. */
  title: string;
  /** Custom header content. Overrides title rendering; title still labels the panel. */
  children?: ReactNode;
  /** Close handler (renders close button when provided) */
  onClose?: () => void;
  /** Action buttons before close button */
  actions?: ReactNode;
}

/** Header component for sidebar apps */
export const SidebarHeader: FC<SidebarHeaderProps> = ({ title, children, onClose, actions }) => {
  const { headingId } = useSidebarPanel();

  const titleContent = children ? (
    <>
      <EuiScreenReaderOnly>
        <h2 id={headingId}>{title}</h2>
      </EuiScreenReaderOnly>
      {children}
    </>
  ) : (
    <EuiTitle size="xs">
      <h2 id={headingId}>{title}</h2>
    </EuiTitle>
  );

  return (
    <header data-test-subj="sidebarHeader">
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
                    aria-label={closeSidebarLabel}
                    color="text"
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </header>
  );
};
