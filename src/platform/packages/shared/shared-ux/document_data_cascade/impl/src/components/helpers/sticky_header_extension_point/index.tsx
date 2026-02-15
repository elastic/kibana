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
   * Ref to the portal container element in the sticky header.
   */
  extensionPointRef: React.RefObject<HTMLDivElement | null>;
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
  extensionPointRef,
  isActiveSticky,
  children,
}: PropsWithChildren<StickyHeaderExtensionPointContextValue>) {
  const value = useMemo<StickyHeaderExtensionPointContextValue>(
    () => ({
      extensionPointRef,
      isActiveSticky,
    }),
    [extensionPointRef, isActiveSticky]
  );

  return (
    <StickyHeaderExtensionPointContext.Provider value={value}>
      {children}
    </StickyHeaderExtensionPointContext.Provider>
  );
}

/**
 * Hook to access the sticky header extension point context.
 * Returns the portal ref and active sticky state, allowing cells to portal content
 * to the sticky header when the row is scrolled.
 *
 * @returns The sticky header extension point context value, or null if not within a provider.
 *
 * @example
 * ```tsx
 * import { useStickyHeaderExtensionPoint } from '@kbn/shared-ux-document-data-cascade';
 * import { createPortal } from 'react-dom';
 *
 * const MyCell = () => {
 *   const stickyHeaderExtensionPoint = useStickyHeaderExtensionPoint();
 *
 *   return (
 *     <>
 *       <div>Cell content</div>
 *       {stickyHeaderExtensionPoint?.isActiveSticky && stickyHeaderExtensionPoint.extensionPointRef.current && createPortal(
 *         <div>Content shown in sticky header</div>,
 *         stickyHeaderExtensionPoint.extensionPointRef.current
 *       )}
 *     </>
 *   );
 * };
 * ```
 */
export function useStickyHeaderExtensionPoint(): StickyHeaderExtensionPointContextValue {
  const ctx = useContext(StickyHeaderExtensionPointContext);
  if (!ctx) {
    throw new Error(
      'useStickyHeaderExtensionPoint must be used within a StickyHeaderExtensionPointProvider'
    );
  }
  return ctx;
}
