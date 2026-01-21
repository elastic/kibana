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

const bodyStyles = (theme: UseEuiTheme) => {
  const { euiTheme } = theme;

  return css`
    ${euiOverflowScroll(theme, { direction: 'y' })};
    padding: ${euiTheme.size.m};
    flex-grow: 1;
  `;
};

/**
 * Props for the SidebarBody compound component
 */
export interface SidebarBodyProps {
  /**
   * Content to render inside the scrollable body area
   */
  children: ReactNode;
}

/**
 * Scrollable body component for sidebar apps.
 * Provides consistent padding and scroll behavior.
 *
 * @example
 * <SidebarBody>
 *   <p>Your content here</p>
 * </SidebarBody>
 */
export const SidebarBody: FC<SidebarBodyProps> = ({ children }) => {
  return (
    <EuiPanel css={bodyStyles} hasShadow={false} paddingSize="none">
      {children}
    </EuiPanel>
  );
};
