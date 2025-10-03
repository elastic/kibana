/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';

/**
 * An orchestrator hook that manages the logic for scrolling an active item into view
 * within a container that may experience layout shifts.
 *
 * @returns An object containing:
 *  - `containerRef`: A ref to be attached to the resizing container element.
 *  - `activeItemRef`: A ref to be attached to the active child item.
 */
export const useScrollToActive = <T extends HTMLElement>() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<T>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !activeItemRef.current) return;

    const scrollNow = () => {
      if (!activeItemRef.current) return;
      requestAnimationFrame(() => {
        activeItemRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      });
    };

    const observer = new ResizeObserver(() => {
      // When the container resizes, we debounce the scroll call to wait for stability.
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(scrollNow, 100);
    });

    observer.observe(containerRef.current);
    scrollNow();

    return () => {
      clearTimeout(debounceTimerRef.current);
      observer.disconnect();
    };
  }, []);

  return { containerRef, activeItemRef };
};
