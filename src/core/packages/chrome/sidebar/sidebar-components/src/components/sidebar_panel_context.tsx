/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';

/** API for configuring the sidebar panel from within consumer components */
export interface SidebarPanelApi {
  /** Override the panel's aria-label (e.g. with the current app title) */
  setLabel: (label: string | undefined) => void;
  /** Set callback invoked when panel unmounts with focus inside. Defaults to focusing main content. */
  setOnFocusRescue: (callback: (() => void) | undefined) => void;
}

export const SidebarPanelContext = createContext<SidebarPanelApi | null>(null);

/** Hook for consumer components to configure the sidebar panel's a11y behavior. Throws outside SidebarPanel. */
export const useSidebarPanel = (): SidebarPanelApi => {
  const ctx = useContext(SidebarPanelContext);
  if (!ctx) {
    throw new Error('useSidebarPanel must be used within a SidebarPanel');
  }
  return ctx;
};
