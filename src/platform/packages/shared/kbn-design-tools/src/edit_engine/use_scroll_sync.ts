/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';
import { useEffect, useRef } from 'react';
import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';
import type { ElementRegistry } from './element_registry';
import { setImportant } from '../lib/dom/set_important';

/**
 * Keeps managed element positions in sync with the Kibana main scroll
 * container and window resize events.
 *
 * @param registry - Ref to the element registry containing tracked sessions.
 */
export const useScrollSync = (registry: MutableRefObject<ElementRegistry>) => {
  const prevScroll = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const scrollEl = document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID);

    const handleScroll = () => {
      if (!scrollEl) return;
      const currentX = scrollEl.scrollLeft;
      const currentY = scrollEl.scrollTop;
      const dx = currentX - prevScroll.current.x;
      const dy = currentY - prevScroll.current.y;
      prevScroll.current = { x: currentX, y: currentY };

      if (dx === 0 && dy === 0) return;

      for (const session of registry.current.values()) {
        // Guard against NaN from empty/invalid inline style values.
        const parsedLeft = parseFloat(session.el.style.left);
        const parsedTop = parseFloat(session.el.style.top);
        if (Number.isNaN(parsedLeft) || Number.isNaN(parsedTop)) continue;

        const left = Math.round(parsedLeft - dx);
        const top = Math.round(parsedTop - dy);
        setImportant(session.el, 'left', `${left}px`);
        setImportant(session.el, 'top', `${top}px`);
      }
    };

    const handleResize = () => {
      if (scrollEl) {
        prevScroll.current = { x: scrollEl.scrollLeft, y: scrollEl.scrollTop };
      }

      for (const session of registry.current.values()) {
        if (!session.referenceEl) continue;
        const refRect = session.referenceEl.getBoundingClientRect();
        setImportant(session.el, 'left', `${refRect.left}px`);
        setImportant(session.el, 'top', `${refRect.top}px`);
        session.originalRect = new DOMRect(
          refRect.left,
          refRect.top,
          session.originalRect.width,
          session.originalRect.height
        );
      }
    };

    // Initialise baseline from current scroll position.
    if (scrollEl) {
      prevScroll.current = { x: scrollEl.scrollLeft, y: scrollEl.scrollTop };
      scrollEl.addEventListener('scroll', handleScroll);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      scrollEl?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [registry]);
};
