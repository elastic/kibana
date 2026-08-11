/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';

export interface RowHeaderSlotsScrollSyncState {
  isScrollable: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

interface RowHeaderSlotsScrollSyncContextValue {
  register: (el: HTMLDivElement) => void;
  unregister: (el: HTMLDivElement) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => RowHeaderSlotsScrollSyncState;
  notifyHover: (el: HTMLDivElement) => void;
  notifyHoverEnd: (el: HTMLDivElement) => void;
}

const DEFAULT_ROW_HEADER_SLOTS_SCROLL_SYNC_STATE: RowHeaderSlotsScrollSyncState = {
  isScrollable: false,
  canScrollLeft: false,
  canScrollRight: false,
};

const RowHeaderSlotsScrollSyncContext = createContext<RowHeaderSlotsScrollSyncContextValue | null>(
  null
);

export const useRowHeaderSlotsScrollSync = () => {
  const context = useContext(RowHeaderSlotsScrollSyncContext);
  if (!context) {
    throw new Error(
      'useRowHeaderSlotsScrollSync must be used within a RowHeaderSlotsScrollSyncProvider'
    );
  }
  return context;
};

const DISPLAY_CONTENTS: React.CSSProperties = { display: 'contents' };

/**
 * Co-ordinates the scroll position of multiple scrollable elements.
 *
 * Uses a single capture-phase scroll listener on a wrapper element to
 * intercept scroll events from all registered containers. Only the element
 * the user is actively scrolling (the "scroll leader") triggers sync;
 * programmatic scrollLeft writes on other containers are ignored via the
 * leader check, preventing the O(N) feedback cascade.
 *
 * Layout-expensive reads (scrollWidth, clientWidth) are cached and only
 * refreshed by the ResizeObserver, keeping the scroll hot path free of
 * forced style recalculations. All intermediate objects (scroll state,
 * scrollTo options, cached dimensions) are mutated in place to minimize
 * GC pressure; a new snapshot object is only allocated when the boolean
 * scroll state actually changes.
 */
export const RowHeaderSlotsScrollSyncProvider: React.FC<{
  children: React.ReactNode;
  disableScrollSync?: boolean;
}> = ({ children, disableScrollSync = false }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containers = useRef<Set<HTMLDivElement>>(new Set());
  const scrollLeader = useRef<HTMLDivElement | null>(null);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canonicalScrollLeft = useRef(0);
  const canonicalScrollState = useRef<RowHeaderSlotsScrollSyncState>(
    DEFAULT_ROW_HEADER_SLOTS_SCROLL_SYNC_STATE
  );

  const resizeObserver = useRef<ResizeObserver | null>(null);
  const observedElement = useRef<HTMLDivElement | null>(null);
  const listeners = useRef<Set<() => void>>(new Set());

  const cachedDimensions = useRef({ scrollWidth: 0, clientWidth: 0 });
  const scrollToOpts = useRef<ScrollToOptions>({ left: 0, behavior: 'instant' });
  const disableScrollSyncRef = useRef(disableScrollSync);
  disableScrollSyncRef.current = disableScrollSync;

  const emitIfChanged = useCallback(
    (isScrollable: boolean, canScrollLeft: boolean, canScrollRight: boolean) => {
      const prev = canonicalScrollState.current;
      if (
        prev.isScrollable !== isScrollable ||
        prev.canScrollLeft !== canScrollLeft ||
        prev.canScrollRight !== canScrollRight
      ) {
        canonicalScrollState.current = { isScrollable, canScrollLeft, canScrollRight };
        for (const l of listeners.current) l();
      }
    },
    []
  );

  const updateCachedDimensions = useCallback((el: HTMLDivElement) => {
    cachedDimensions.current.scrollWidth = el.scrollWidth;
    cachedDimensions.current.clientWidth = el.clientWidth;
  }, []);

  const subscribe = useCallback((listener: () => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const getSnapshot = useCallback(() => canonicalScrollState.current, []);

  const register = useCallback((el: HTMLDivElement) => {
    scrollToOpts.current.left = canonicalScrollLeft.current;
    el.scrollTo(scrollToOpts.current);
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

  const notifyHover = useCallback(
    (el: HTMLDivElement) => {
      if (observedElement.current === el) return;

      if (observedElement.current) {
        resizeObserver.current?.unobserve(observedElement.current);
      }

      observedElement.current = el;
      updateCachedDimensions(el);
      resizeObserver.current?.observe(el);
    },
    [updateCachedDimensions]
  );

  const notifyHoverEnd = useCallback((_el: HTMLDivElement) => {
    // Keep observing the element as a sentinel for resize detection.
  }, []);

  const clearScrollLeader = useCallback(() => {
    scrollLeader.current = null;
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const onScrollCapture = (e: Event) => {
      const target = e.target as HTMLDivElement;
      if (!containers.current.has(target)) return;
      if (
        (scrollLeader.current && scrollLeader.current !== target) ||
        disableScrollSyncRef.current
      ) {
        return;
      }

      // this element becomes the scroll leader
      scrollLeader.current = target;

      // Clear any pending timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      const { scrollLeft } = target;
      // track the canonical position
      canonicalScrollLeft.current = scrollLeft;

      let { scrollWidth, clientWidth } = cachedDimensions.current;
      if (scrollWidth === 0) {
        scrollWidth = target.scrollWidth;
        clientWidth = target.clientWidth;
        cachedDimensions.current.scrollWidth = scrollWidth;
        cachedDimensions.current.clientWidth = clientWidth;
      }

      const isScrollable = scrollWidth > clientWidth;
      emitIfChanged(
        isScrollable,
        isScrollable && scrollLeft > 0,
        isScrollable && scrollLeft + clientWidth < scrollWidth - 1
      );

      scrollToOpts.current.left = scrollLeft;
      for (const container of containers.current) {
        if (container !== target) {
          container.scrollTo(scrollToOpts.current);
        }
      }

      scrollTimeout.current = setTimeout(clearScrollLeader, 50);
    };

    el.addEventListener('scroll', onScrollCapture, { capture: true, passive: true });

    return () => {
      el.removeEventListener('scroll', onScrollCapture, { capture: true });
    };
  }, [emitIfChanged, clearScrollLeader]);

  useEffect(() => {
    resizeObserver.current = new ResizeObserver(() => {
      if (observedElement.current) {
        updateCachedDimensions(observedElement.current);
        const { scrollWidth, clientWidth } = cachedDimensions.current;
        const isScrollable = scrollWidth > clientWidth;
        const sl = canonicalScrollLeft.current;
        emitIfChanged(
          isScrollable,
          isScrollable && sl > 0,
          isScrollable && sl + clientWidth < scrollWidth - 1
        );
      }
    });

    return () => {
      resizeObserver.current?.disconnect();
      resizeObserver.current = null;
    };
  }, [emitIfChanged, updateCachedDimensions]);

  return (
    <div ref={wrapperRef} style={DISPLAY_CONTENTS}>
      <RowHeaderSlotsScrollSyncContext.Provider
        value={{
          register,
          unregister,
          subscribe,
          getSnapshot,
          notifyHover,
          notifyHoverEnd,
        }}
      >
        {children}
      </RowHeaderSlotsScrollSyncContext.Provider>
    </div>
  );
};
