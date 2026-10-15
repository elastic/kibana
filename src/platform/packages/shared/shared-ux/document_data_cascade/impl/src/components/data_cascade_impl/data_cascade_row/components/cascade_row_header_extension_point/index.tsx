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
  /**
   * The portal container element in the sticky header. `null` until the sticky header
   * has been committed to the DOM, or when the row is not the active sticky row.
   */
  extensionPointElement: HTMLDivElement | null;
  /**
   * Whether the current row is the active sticky row.
   */
  isActiveSticky: boolean;
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
  isActiveSticky,
  children,
}: PropsWithChildren<StickyHeaderExtensionPointContextValue>) {
  const value = useMemo<StickyHeaderExtensionPointContextValue>(
    () => ({
      extensionPointElement,
      isActiveSticky,
    }),
    [extensionPointElement, isActiveSticky]
  );

  return (
    <StickyHeaderExtensionPointContext.Provider value={value}>
      {children}
    </StickyHeaderExtensionPointContext.Provider>
  );
}

export function useStickyHeaderExtensionPoint(): StickyHeaderExtensionPointContextValue | null {
  return useContext(StickyHeaderExtensionPointContext);
}
