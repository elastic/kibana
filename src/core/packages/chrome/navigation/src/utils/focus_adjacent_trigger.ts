/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefObject } from 'react';

/**
 * Utility function to focus the adjacent trigger element.
 *
 * @param direction - the direction to focus the adjacent trigger element.
 */
export const focusAdjacentTrigger = (ref: RefObject<HTMLElement>, direction: -1 | 1) => {
  if (typeof window === 'undefined' || !ref.current) return;

  const container = document.querySelector<HTMLElement>('#navigation-root');
  const triggers = container
    ? Array.from<HTMLElement>(container.querySelectorAll('[data-menu-item]')).filter((el) => {
        if (el.hasAttribute('disabled')) return false;
        if (el.getAttribute('aria-hidden') === 'true') return false;

        const style = window.getComputedStyle?.(el);

        if (style) return style.display !== 'none' && style.visibility !== 'hidden';

        return true;
      })
    : [];

  const currentIdx = triggers.indexOf(ref.current);
  if (currentIdx === -1) return;

  const nextIdx = Math.max(0, Math.min(triggers.length - 1, currentIdx + direction));
  triggers[nextIdx]?.focus();
};
