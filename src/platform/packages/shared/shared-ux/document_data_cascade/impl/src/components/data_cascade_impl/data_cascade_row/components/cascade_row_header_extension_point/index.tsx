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
  extensionPointElement: HTMLDivElement | null;
  rowIndex: number;
  /** The row's own element, `null` until it is attached. */
  rowElement: HTMLDivElement | null;
  headerElementRef: React.RefObject<HTMLDivElement>;
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
  rowIndex,
  rowElement,
  headerElementRef,
  children,
}: PropsWithChildren<StickyHeaderExtensionPointContextValue>) {
  const value = useMemo<StickyHeaderExtensionPointContextValue>(
    () => ({
      extensionPointElement,
      stickyEnabled,
      rowIndex,
      rowElement,
      headerElementRef,
    }),
    [extensionPointElement, stickyEnabled, rowIndex, rowElement, headerElementRef]
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
