/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode, useContext, createContext } from 'react';
import type { SidebarStart } from '@kbn/core-chrome-sidebar';

// -- Sidebar service context (internal) --

interface SidebarContextValue {
  sidebar: SidebarStart;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

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
export function useSidebarService(): SidebarStart {
  return useSidebarContext().sidebar;
}

// -- Sidebar panel context (shared between core and plugins) --

/** Context for the sidebar panel, shared with consumer components */
export interface SidebarPanelContextValue {
  /** ID to place on the panel's heading element for aria-labelledby */
  headingId: string;
  /** Override focus target when the panel unmounts with focus inside. Defaults to main content. */
  setOnFocusRescue: (callback: (() => void) | undefined) => void;
}

export const SidebarPanelContext = createContext<SidebarPanelContextValue | null>(null);

/** Hook for consumer components to access the sidebar panel context. Throws outside SidebarPanel. */
export const useSidebarPanel = (): SidebarPanelContextValue => {
  const ctx = useContext(SidebarPanelContext);
  if (!ctx) {
    throw new Error('useSidebarPanel must be used within a SidebarPanel');
  }
  return ctx;
};
