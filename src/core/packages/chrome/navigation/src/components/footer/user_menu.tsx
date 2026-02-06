/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

export interface FooterUserMenuProps {
  children: ReactNode;
}

/**
 * Wrapper component for user menu in the navigation footer.
 * Provides consistent styling and positioning.
 */
export const FooterUserMenu = ({ children }: FooterUserMenuProps) => {
  const { euiTheme } = useEuiTheme();

  const wrapperStyles = css`
    display: flex;
    justify-content: center;
    width: 100%;
    padding: ${euiTheme.size.xs} 0;
  `;

  return <div css={wrapperStyles}>{children}</div>;
};
