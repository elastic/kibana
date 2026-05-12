/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import type { ElementRegistry } from '../components/edit/element_registry';

/**
 * Keeps clone positions in sync with their original elements during scroll.
 *
 * Regular elements: re-read the original's viewport position via
 * getBoundingClientRect and apply it to the clone.
 *
 * Duplicates: the original is position:fixed and may be display:none, so
 * getBoundingClientRect is unreliable. Instead, apply a scroll delta to the
 * visible element (clone or duplicate itself) so it appears to scroll with
 * the page content.
 */
export const useScrollSync = (registry: MutableRefObject<ElementRegistry>) => {
  // Track scrollTop/scrollLeft per scrolling container to compute deltas.
  // Kibana scrolls via inner containers, not the window.
  const scrollPositions = useRef(new WeakMap<EventTarget, { x: number; y: number }>());

  const handleScroll = useCallback(
    (event: Event) => {
      const target = event.target;
      if (!target) return;

      // Compute scroll delta from the element that actually scrolled
      const el = target === document ? document.documentElement : (target as HTMLElement);
      const currentX = el.scrollLeft ?? 0;
      const currentY = el.scrollTop ?? 0;
      const prev = scrollPositions.current.get(target);
      const scrollDx = prev ? currentX - prev.x : 0;
      const scrollDy = prev ? currentY - prev.y : 0;
      scrollPositions.current.set(target, { x: currentX, y: currentY });

      for (const session of registry.current.values()) {
        if (session.isDuplicate) {
          // Adjust the visible element (clone if dragged, duplicate if not)
          // by the scroll delta so it appears to be part of the page content.
          const visible = session.clone ?? session.el;
          const left = parseFloat(visible.style.left) - scrollDx;
          const top = parseFloat(visible.style.top) - scrollDy;
          visible.style.left = `${left}px`;
          visible.style.top = `${top}px`;
        } else {
          if (!session.clone) continue;
          const rect = session.el.getBoundingClientRect();
          session.clone.style.left = `${rect.left}px`;
          session.clone.style.top = `${rect.top}px`;
        }
      }
    },
    [registry]
  );

  useEffect(() => {
    document.addEventListener('scroll', handleScroll, true);
    return () => document.removeEventListener('scroll', handleScroll, true);
  }, [handleScroll]);
};
