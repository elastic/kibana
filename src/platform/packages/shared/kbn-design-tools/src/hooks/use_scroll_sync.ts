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
import type { ElementRegistry } from '../components';

/**
 * Keeps managed element positions in sync during scroll using
 * delta tracking. No reference to original elements is needed.
 */
export const useScrollSync = (registry: MutableRefObject<ElementRegistry>) => {
  const scrollPositions = useRef(new WeakMap<EventTarget, { x: number; y: number }>());

  const handleScroll = useCallback(
    (event: Event) => {
      const target = event.target;
      if (!target) return;

      const el = target === document ? document.documentElement : (target as HTMLElement);
      const currentX = el.scrollLeft ?? 0;
      const currentY = el.scrollTop ?? 0;
      const prev = scrollPositions.current.get(target);
      const scrollDx = prev ? currentX - prev.x : 0;
      const scrollDy = prev ? currentY - prev.y : 0;
      scrollPositions.current.set(target, { x: currentX, y: currentY });

      for (const session of registry.current.values()) {
        const left = parseFloat(session.el.style.left) - scrollDx;
        const top = parseFloat(session.el.style.top) - scrollDy;
        session.el.style.left = `${left}px`;
        session.el.style.top = `${top}px`;
      }
    },
    [registry]
  );

  useEffect(() => {
    document.addEventListener('scroll', handleScroll, true);
    return () => document.removeEventListener('scroll', handleScroll, true);
  }, [handleScroll]);
};
