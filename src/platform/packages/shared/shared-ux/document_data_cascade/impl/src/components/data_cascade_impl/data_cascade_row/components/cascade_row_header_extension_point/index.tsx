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
   * The portal container element in the sticky header. The element is created once per row and is
   * attached to the sticky header whenever it is displayed, so consumers can portal into it on the
   * same render that `isActiveSticky` turns true.
   */
  extensionPointElement: HTMLDivElement;
  /**
   * Whether the sticky header is currently displayed for this row.
   */
  isDisplayed: boolean;
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
  isDisplayed,
  children,
}: PropsWithChildren<StickyHeaderExtensionPointContextValue>) {
  const value = useMemo<StickyHeaderExtensionPointContextValue>(
    () => ({
      extensionPointElement,
      isDisplayed,
    }),
    [extensionPointElement, isDisplayed]
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
