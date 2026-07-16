/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode, RefObject } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { type EuiBreakpointSize, useCurrentEuiBreakpoint, useEuiTheme } from '@elastic/eui';

const BREAKPOINTS: readonly EuiBreakpointSize[] = ['xs', 's', 'm', 'l', 'xl'];

interface ChromeApplicationBreakpointRegistry {
  __KIBANA_CHROME_APPLICATION_BREAKPOINT_CTX__?: React.Context<EuiBreakpointSize | undefined>;
}

// Provider and consumers can load from different bundles, so they must share one context instance.
const registry = globalThis as typeof globalThis & ChromeApplicationBreakpointRegistry;

const ChromeApplicationBreakpointContext =
  (registry.__KIBANA_CHROME_APPLICATION_BREAKPOINT_CTX__ ??= createContext<
    EuiBreakpointSize | undefined
  >(undefined));

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
  const [breakpoint, setBreakpoint] = useState<EuiBreakpointSize>();

  useEffect(() => {
    const target = targetRef.current;
    if (!target) {
      return;
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = entry.contentBoxSize[0]?.inlineSize ?? entry.contentRect.width;
      const nextBreakpoint = resolveBreakpoint(width, euiTheme.breakpoint);
      setBreakpoint((currentBreakpoint) =>
        currentBreakpoint === nextBreakpoint ? currentBreakpoint : nextBreakpoint
      );
    });

    resizeObserver.observe(target, { box: 'content-box' });

    return () => resizeObserver.disconnect();
  }, [euiTheme.breakpoint, targetRef]);

  return (
    <ChromeApplicationBreakpointContext.Provider value={breakpoint}>
      {children}
    </ChromeApplicationBreakpointContext.Provider>
  );
};

export const useCurrentChromeApplicationBreakpoint = (): EuiBreakpointSize | undefined => {
  const applicationBreakpoint = useContext(ChromeApplicationBreakpointContext);
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
