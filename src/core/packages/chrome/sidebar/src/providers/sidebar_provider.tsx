/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode, useContext } from 'react';
import { getOrCreateContext } from '@kbn/react-context-registry';
import type { SidebarService } from '../services';

interface SidebarContextValue {
  sidebar: SidebarService;
}

const SidebarContext = getOrCreateContext<SidebarContextValue | null>(
  '@kbn/core-chrome-sidebar/SidebarContext',
  null
);

export interface SidebarProviderProps {
  children: ReactNode;
  value: SidebarContextValue;
}

export function SidebarServiceProvider({ children, value }: SidebarProviderProps) {
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

function useSidebarContext(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarService must be used within a SidebarServiceProvider');
  }
  return context;
}

/**
 * @internal
 */
export function useSidebarService(): SidebarService {
  return useSidebarContext().sidebar;
}

/**
 * @internal
 */
export function useSidebarStateService(): SidebarService['state'] {
  return useSidebarService().state;
}

/**
 * @internal
 */
export function useSidebarAppStateService(): SidebarService['appState'] {
  return useSidebarService().appState;
}
