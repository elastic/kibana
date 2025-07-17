/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

export interface SideNavFooterProps {
  children: ReactNode;
  isCollapsed: boolean;
}

export const SideNavFooter = ({ children, isCollapsed }: SideNavFooterProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();

  return (
    <footer
      // TODO: translate
      aria-label="Side navigation footer"
      css={css`
        align-items: center;
        border-top: 1px solid ${euiTheme.colors.borderBaseSubdued};
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.xs};
        justify-content: center;
        padding-top: ${isCollapsed ? euiTheme.size.s : euiTheme.size.m};
      `}
    >
      {children}
    </footer>
  );
};
