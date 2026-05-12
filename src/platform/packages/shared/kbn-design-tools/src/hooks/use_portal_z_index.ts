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
 */
export const usePortalZIndex = (elementId: string, zIndex: number, isOpen: boolean) => {
  useEffect(() => {
    if (!isOpen) return;
    const z = String(zIndex);

    const rafId = requestAnimationFrame(() => {
      const targetEl = document.getElementById(elementId);
      const portalParent = targetEl?.closest('[data-euiportal="true"]');

      if (portalParent instanceof HTMLElement) {
        portalParent.style.zIndex = z;
      }
      if (targetEl instanceof HTMLElement) {
        targetEl.style.zIndex = z;
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [isOpen, elementId, zIndex]);
};
