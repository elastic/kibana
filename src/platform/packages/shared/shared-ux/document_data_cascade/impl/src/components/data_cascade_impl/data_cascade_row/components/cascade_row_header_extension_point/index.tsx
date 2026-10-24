/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useMemo, type PropsWithChildren } from 'react';

export interface StickyHeaderExtensionPointContextValue {
  /** Stable portal container attached to the row's inline header. */
  extensionPointElement: HTMLDivElement;
  /** Whether the header uses sticky positioning rather than remaining in normal flow. */
  stickyEnabled: boolean;
}

const StickyHeaderExtensionPointContext =
  createContext<StickyHeaderExtensionPointContextValue | null>(null);

/**
 * @internal
 * @description Provider component that provides an extension point for the sticky header
 * available to descendant cells.
 */
export function StickyHeaderExtensionPointProvider({
  extensionPointElement,
  stickyEnabled,
  children,
}: PropsWithChildren<StickyHeaderExtensionPointContextValue>) {
  const value = useMemo<StickyHeaderExtensionPointContextValue>(
    () => ({
      extensionPointElement,
      stickyEnabled,
    }),
    [extensionPointElement, stickyEnabled]
  );

  return (
    <StickyHeaderExtensionPointContext.Provider value={value}>
      {children}
    </StickyHeaderExtensionPointContext.Provider>
  );
}

export function useStickyHeaderExtensionPoint() {
  const ctx = useContext(StickyHeaderExtensionPointContext);
  if (!ctx) {
    throw new Error(
      'useStickyHeaderExtensionPoint must be used within a StickyHeaderExtensionPointProvider'
    );
  }
  return ctx;
}
