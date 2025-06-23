/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { ChromeLayoutComponent, type ChromeLayoutComponentProps } from './layout.component';
import { LayoutGlobalCSS } from './layout_global_css';
import { LayoutStateProvider } from './layout_state_context';

/**
 * Props for the ChromeLayout component.
 * @public
 */
export type ChromeLayoutProps = ChromeLayoutComponentProps;

/**
 * The main Chrome layout component.
 * Sets up the layout and required global css.
 *
 * @public
 * @param props - Props for the ChromeLayout component.
 * @returns The rendered ChromeLayout component.
 */
export const ChromeLayout = ({ children, ...props }: ChromeLayoutProps) => {
  return (
    <LayoutStateProvider {...props}>
      <LayoutGlobalCSS />
      <ChromeLayoutComponent {...props}>{children}</ChromeLayoutComponent>
    </LayoutStateProvider>
  );
};
