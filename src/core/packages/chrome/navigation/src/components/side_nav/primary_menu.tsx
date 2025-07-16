/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React, { forwardRef, ForwardedRef, ReactNode } from 'react';
import { useEuiTheme } from '@elastic/eui';

export interface SideNavPrimaryMenuProps {
  children: ReactNode;
  isCollapsed: boolean;
}

export const SideNavPrimaryMenu = forwardRef<HTMLElement, SideNavPrimaryMenuProps>(
  ({ children, isCollapsed }, ref: ForwardedRef<HTMLElement>): JSX.Element => {
    const { euiTheme } = useEuiTheme();

    return (
      <nav
        id="primary-navigation"
        aria-label="Main navigation"
        ref={ref}
        css={css`
          align-items: center;
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: ${isCollapsed ? euiTheme.size.xs : euiTheme.size.base};
        `}
      >
        {children}
      </nav>
    );
  }
);
