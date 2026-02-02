/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useMemo, type PropsWithChildren } from 'react';

export interface StickyHeaderPortalContextValue {
  /**
   * Ref to the portal container element in the sticky header.
   */
  extensionPointRef: React.RefObject<HTMLDivElement | null>;
  /**
   * Whether the current row is the active sticky row.
   */
  isActiveSticky: boolean;
}

const StickyHeaderPortalContext = createContext<StickyHeaderPortalContextValue | null>(null);

/**
 * @internal
 * @description Provider component that makes the sticky header portal ref available to descendant cells.
 */
export function StickyHeaderPortalProvider({
  extensionPointRef,
  isActiveSticky,
  children,
}: PropsWithChildren<StickyHeaderPortalContextValue>) {
  const value = useMemo<StickyHeaderPortalContextValue>(
    () => ({
      extensionPointRef,
      isActiveSticky,
    }),
    [extensionPointRef, isActiveSticky]
  );

  return (
    <StickyHeaderPortalContext.Provider value={value}>
      {children}
    </StickyHeaderPortalContext.Provider>
  );
}

/**
 * Hook to access the sticky header portal context.
 * Returns the portal ref and active sticky state, allowing cells to portal content
 * to the sticky header when the row is scrolled.
 *
 * @returns The sticky header portal context value, or null if not within a provider.
 *
 * @example
 * ```tsx
 * import { useStickyHeaderPortal } from '@kbn/shared-ux-document-data-cascade';
 * import { createPortal } from 'react-dom';
 *
 * const MyCell = () => {
 *   const stickyPortal = useStickyHeaderPortal();
 *
 *   return (
 *     <>
 *       <div>Cell content</div>
 *       {stickyPortal?.isActiveSticky && stickyPortal.portalRef.current && createPortal(
 *         <div>Content shown in sticky header</div>,
 *         stickyPortal.portalRef.current
 *       )}
 *     </>
 *   );
 * };
 * ```
 */
export function useStickyHeaderPortal(): StickyHeaderPortalContextValue {
  const ctx = useContext(StickyHeaderPortalContext);
  if (!ctx) {
    throw new Error('useStickyHeaderPortal must be used within a StickyHeaderPortalProvider');
  }
  return ctx;
}
