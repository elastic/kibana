/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';

export interface ScrollSyncScrollState {
  isScrollable: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

interface ScrollSyncContextValue {
  register: (el: HTMLDivElement) => void;
  unregister: (el: HTMLDivElement) => void;
  syncScroll: (source: HTMLDivElement) => void;
  getScrollState: () => ScrollSyncScrollState;
  notifyHover: (el: HTMLDivElement) => void;
  notifyHoverEnd: (el: HTMLDivElement) => void;
}

const DEFAULT_SCROLL_STATE: ScrollSyncScrollState = {
  isScrollable: false,
  canScrollLeft: false,
  canScrollRight: false,
};

const ScrollSyncContext = createContext<ScrollSyncContextValue | null>(null);

export const useScrollSync = () => {
  const context = useContext(ScrollSyncContext);
  if (!context) {
    throw new Error('useScrollSync must be used within a ScrollSyncProvider');
  }
  return context;
};

const computeScrollState = (el: HTMLDivElement): ScrollSyncScrollState => {
  const { scrollLeft, scrollWidth, clientWidth } = el;
  const isScrollable = scrollWidth > clientWidth;
  return {
    isScrollable,
    canScrollLeft: isScrollable && scrollLeft > 0,
    canScrollRight: isScrollable && scrollLeft + clientWidth < scrollWidth - 1,
  };
};

/**
 * Co-ordinates the scroll position of multiple scrollable elements.
 * Uses a "scroll leader" pattern - only the element actively being scrolled
 * by the user drives the sync, preventing feedback loops.
 *
 * Also owns a single shared ResizeObserver that watches whichever row is
 * currently hovered (or the last-hovered row as a sentinel).
 */
export const ScrollSyncProvider: React.FC<{
  children: React.ReactNode;
  disableScrollSync?: boolean;
}> = ({ children, disableScrollSync = false }) => {
  const containers = useRef<Set<HTMLDivElement>>(new Set());
  const scrollLeader = useRef<HTMLDivElement | null>(null);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canonicalScrollLeft = useRef(0);
  const canonicalScrollState = useRef<ScrollSyncScrollState>(DEFAULT_SCROLL_STATE);

  const resizeObserver = useRef<ResizeObserver | null>(null);
  const observedElement = useRef<HTMLDivElement | null>(null);

  const getScrollState = useCallback(() => canonicalScrollState.current, []);

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
    if (observedElement.current === el) {
      resizeObserver.current?.unobserve(el);
      observedElement.current = null;
    }
  }, []);

  const notifyHover = useCallback((el: HTMLDivElement) => {
    if (observedElement.current === el) return;

    if (observedElement.current) {
      resizeObserver.current?.unobserve(observedElement.current);
    }

    observedElement.current = el;
    resizeObserver.current?.observe(el);
  }, []);

  const notifyHoverEnd = useCallback((_el: HTMLDivElement) => {
    // Keep observing the element as a sentinel for resize detection.
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
      canonicalScrollState.current = computeScrollState(source);

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

  useEffect(() => {
    resizeObserver.current = new ResizeObserver(() => {
      if (observedElement.current) {
        canonicalScrollState.current = computeScrollState(observedElement.current);
      }
    });

    return () => {
      resizeObserver.current?.disconnect();
      resizeObserver.current = null;
    };
  }, []);

  return (
    <ScrollSyncContext.Provider
      value={{ register, unregister, syncScroll, getScrollState, notifyHover, notifyHoverEnd }}
    >
      {children}
    </ScrollSyncContext.Provider>
  );
};
