/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';

/**
 * Forces the z-index of an EuiPortal parent so the portal renders above
 * overlay layers. Uses requestAnimationFrame because the portal DOM node
 * doesn't exist during synchronous layout effects.
 *
 * @param elementId - The DOM ID of the portal element.
 * @param zIndex - The z-index value to force.
 * @param isOpen - Whether the portal is currently open.
 */
export const usePortalZIndex = (elementId: string, zIndex: number, isOpen: boolean) => {
  useEffect(() => {
    if (!isOpen) return;
    const z = String(zIndex);
    let observer: MutationObserver | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const applyZIndex = (): boolean => {
      const targetEl = document.getElementById(elementId);
      const portalParent = targetEl?.closest('[data-euiportal="true"]');

      if (portalParent instanceof HTMLElement) {
        portalParent.style.zIndex = z;
      }
      if (targetEl instanceof HTMLElement) {
        targetEl.style.zIndex = z;
        return true;
      }
      return false;
    };

    // Try immediately via rAF. This covers the common case.
    const rafId = requestAnimationFrame(() => {
      if (applyZIndex()) return;

      // Portal not yet rendered. Observe DOM additions and retry.
      // This handles cases where React defers the portal render
      // (e.g. concurrent mode, Suspense).
      observer = new MutationObserver(() => {
        if (applyZIndex()) {
          observer?.disconnect();
          if (timeoutId !== undefined) clearTimeout(timeoutId);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // Safety: disconnect after 2s to avoid observing indefinitely
      // if the portal never appears.
      timeoutId = setTimeout(() => observer?.disconnect(), 2000);
    });

    return () => {
      cancelAnimationFrame(rafId);
      observer?.disconnect();
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [isOpen, elementId, zIndex]);
};
