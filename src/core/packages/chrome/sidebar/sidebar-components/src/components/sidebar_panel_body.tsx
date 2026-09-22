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
import { EuiPanel, euiOverflowScroll } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const bodyStyles = (scrollable: boolean) => (theme: UseEuiTheme) => {
  const { euiTheme } = theme;

  return css`
    ${scrollable && euiOverflowScroll(theme, { direction: 'y' })};
    padding: ${euiTheme.size.m};
    flex-grow: 1;
  `;
};

const sidebarContentLabel = i18n.translate('core.ui.chrome.sidebar.sidebarContentLabel', {
  defaultMessage: 'Side panel content',
});

export interface SidebarBodyProps {
  children: ReactNode;
  /** Makes the body keyboard-scrollable with `tabIndex={0}` and announces it as a region. Defaults to false. */
  scrollable?: boolean;
}

/** Body component for sidebar apps */
export const SidebarBody: FC<SidebarBodyProps> = ({ children, scrollable = false }) => {
  return (
    <EuiPanel
      {...(scrollable && { tabIndex: 0, role: 'region', 'aria-label': sidebarContentLabel })}
      css={bodyStyles(scrollable)}
      hasShadow={false}
      paddingSize="none"
      data-test-subj="sidebarBody"
    >
      {children}
    </EuiPanel>
  );
};
