/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode, RefObject } from 'react';
import React, { useEffect, useSyncExternalStore } from 'react';
import { type EuiBreakpointSize, useCurrentEuiBreakpoint, useEuiTheme } from '@elastic/eui';

const BREAKPOINTS: readonly EuiBreakpointSize[] = ['xs', 's', 'm', 'l', 'xl'];

interface ChromeApplicationBreakpointStore {
  getSnapshot: () => EuiBreakpointSize | undefined;
  setSnapshot: (breakpoint: EuiBreakpointSize | undefined) => void;
  subscribe: (listener: () => void) => () => void;
}

interface ChromeApplicationBreakpointRegistry {
  __KIBANA_CHROME_APPLICATION_BREAKPOINT_STORE__?: ChromeApplicationBreakpointStore;
}

const createBreakpointStore = (): ChromeApplicationBreakpointStore => {
  let breakpoint: EuiBreakpointSize | undefined;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => breakpoint,
    setSnapshot: (nextBreakpoint) => {
      if (breakpoint === nextBreakpoint) {
        return;
      }

      breakpoint = nextBreakpoint;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

// The layout and application can use separate React roots and bundles, so they share one store.
const registry = globalThis as typeof globalThis & ChromeApplicationBreakpointRegistry;

const breakpointStore = (registry.__KIBANA_CHROME_APPLICATION_BREAKPOINT_STORE__ ??=
  createBreakpointStore());

const resolveBreakpoint = (
  width: number,
  breakpointValues: Record<EuiBreakpointSize, number>
): EuiBreakpointSize =>
  BREAKPOINTS.reduce(
    (current, breakpoint) => (width >= breakpointValues[breakpoint] ? breakpoint : current),
    BREAKPOINTS[0]
  );

export interface ChromeApplicationBreakpointProviderProps {
  children: ReactNode;
  targetRef: RefObject<HTMLElement>;
}

export const ChromeApplicationBreakpointProvider = ({
  children,
  targetRef,
}: ChromeApplicationBreakpointProviderProps) => {
  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    const target = targetRef.current;
    if (!target) {
      return;
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = entry.contentBoxSize[0]?.inlineSize ?? entry.contentRect.width;
      const nextBreakpoint = resolveBreakpoint(width, euiTheme.breakpoint);

      breakpointStore.setSnapshot(nextBreakpoint);
    });

    resizeObserver.observe(target, { box: 'content-box' });

    return () => {
      resizeObserver.disconnect();
      breakpointStore.setSnapshot(undefined);
    };
  }, [euiTheme.breakpoint, targetRef]);

  return <>{children}</>;
};

export const useCurrentChromeApplicationBreakpoint = (): EuiBreakpointSize | undefined => {
  const applicationBreakpoint = useSyncExternalStore(
    breakpointStore.subscribe,
    breakpointStore.getSnapshot,
    breakpointStore.getSnapshot
  );
  const viewportBreakpoint = useCurrentEuiBreakpoint();
  const viewportApplicationBreakpoint = BREAKPOINTS.find(
    (breakpoint) => breakpoint === viewportBreakpoint
  );

  return applicationBreakpoint ?? viewportApplicationBreakpoint;
};

export const useIsWithinChromeApplicationBreakpoints = (
  breakpoints: EuiBreakpointSize[],
  isResponsive = true
): boolean => {
  const currentBreakpoint = useCurrentChromeApplicationBreakpoint();

  return Boolean(currentBreakpoint && isResponsive && breakpoints.includes(currentBreakpoint));
};
