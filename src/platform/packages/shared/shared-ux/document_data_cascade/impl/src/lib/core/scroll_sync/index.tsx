/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useRef, useCallback } from 'react';

interface ScrollSyncContextValue {
  register: (el: HTMLDivElement) => void;
  unregister: (el: HTMLDivElement) => void;
  syncScroll: (source: HTMLDivElement) => void;
}

const ScrollSyncContext = createContext<ScrollSyncContextValue | null>(null);

export const useScrollSync = () => {
  const context = useContext(ScrollSyncContext);
  if (!context) {
    throw new Error('useScrollSync must be used within a ScrollSyncProvider');
  }
  return context;
};

/**
 * Co-ordinates the scroll position of multiple scrollable elements.
 * Uses a "scroll leader" pattern - only the element actively being scrolled
 * by the user drives the sync, preventing feedback loops.
 */
export const ScrollSyncProvider: React.FC<{
  children: React.ReactNode;
  disableScrollSync?: boolean;
}> = ({ children, disableScrollSync = false }) => {
  const containers = useRef<Set<HTMLDivElement>>(new Set());
  const scrollLeader = useRef<HTMLDivElement | null>(null);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Canonical scroll position - always tracked, used to initialize new containers
  const canonicalScrollLeft = useRef(0);

  const register = useCallback((el: HTMLDivElement) => {
    // New containers adopt the canonical scroll position immediately
    el.scrollLeft = canonicalScrollLeft.current;
    containers.current.add(el);
  }, []);

  const unregister = useCallback((el: HTMLDivElement) => {
    containers.current.delete(el);
    if (scrollLeader.current === el) {
      scrollLeader.current = null;
    }
  }, []);

  const syncScroll = useCallback(
    (source: HTMLDivElement) => {
      // If another element is the scroll leader, ignore this event
      // (it's a programmatic scroll from syncing)
      if ((scrollLeader.current && scrollLeader.current !== source) || disableScrollSync) {
        return;
      }

      // This element becomes the scroll leader
      scrollLeader.current = source;

      // Clear any pending timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      const { scrollLeft } = source;

      // track the canonical position
      canonicalScrollLeft.current = scrollLeft;

      // perform the sync
      containers.current.forEach((el) => {
        if (el !== source && el.scrollLeft !== scrollLeft) {
          el.scrollLeft = scrollLeft;
        }
      });

      // Release leadership after scrolling stops (50ms debounce)
      scrollTimeout.current = setTimeout(() => {
        scrollLeader.current = null;
      }, 50);
    },
    [disableScrollSync]
  );

  return (
    <ScrollSyncContext.Provider value={{ register, unregister, syncScroll }}>
      {children}
    </ScrollSyncContext.Provider>
  );
};
