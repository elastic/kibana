/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { LayoutDimensions } from './layout.types';

/**
 * Configuration for the layout.
 * @public
 */
export type LayoutConfig = Pick<
  Partial<LayoutDimensions>,
  | 'bannerHeight'
  | 'headerHeight'
  | 'footerHeight'
  | 'navigationWidth'
  | 'sidebarWidth'
  | 'sidebarPanelWidth'
  | 'applicationTopBarHeight'
  | 'applicationBottomBarHeight'
>;

const LayoutConfigContext = createContext<LayoutConfig | undefined>(undefined);

/**
 * Props for the LayoutConfigProvider component.
 * @public
 */
export interface LayoutConfigProviderProps {
  value: LayoutConfig;
  children: ReactNode;
}

/**
 * Provider of the layout config
 * @public
 */
export const LayoutConfigProvider = ({ value, children }: LayoutConfigProviderProps) => {
  return <LayoutConfigContext.Provider value={value}>{children}</LayoutConfigContext.Provider>;
};

/**
 * Hook to access the layout configuration.
 * @internal
 * @returns The current layout configuration
 * @throws Error if used outside of a LayoutConfigProvider
 */
export function useLayoutConfig(): LayoutConfig {
  const context = useContext(LayoutConfigContext);
  if (!context) {
    throw new Error('useLayoutConfig must be used within a LayoutConfigProvider');
  }
  return context;
}
