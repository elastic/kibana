/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useLayoutEffect, useState } from 'react';
import { type EuiBreakpointSize, useEuiTheme } from '@elastic/eui';
import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/ui-chrome-layout-constants';

const BREAKPOINTS: readonly EuiBreakpointSize[] = ['xs', 's', 'm', 'l', 'xl'];

const resolveBreakpoint = (
  width: number,
  breakpointValues: Record<EuiBreakpointSize, number>
): EuiBreakpointSize =>
  BREAKPOINTS.reduce(
    (current, breakpoint) => (width >= breakpointValues[breakpoint] ? breakpoint : current),
    BREAKPOINTS[0]
  );

export const useCurrentChromeApplicationBreakpoint = (): EuiBreakpointSize | undefined => {
  const { euiTheme } = useEuiTheme();
  const [breakpoint, setBreakpoint] = useState<EuiBreakpointSize>();

  useLayoutEffect(() => {
    const application = document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID);
    if (!(application instanceof HTMLElement)) {
      setBreakpoint(undefined);
      return;
    }

    const updateBreakpoint = (width: number) => {
      setBreakpoint(resolveBreakpoint(width, euiTheme.breakpoint));
    };
    const { paddingLeft, paddingRight } = getComputedStyle(application);
    const initialWidth =
      application.clientWidth - (parseFloat(paddingLeft) || 0) - (parseFloat(paddingRight) || 0);

    updateBreakpoint(initialWidth);

    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = entry.contentBoxSize[0]?.inlineSize ?? entry.contentRect.width;

      updateBreakpoint(width);
    });

    resizeObserver.observe(application, { box: 'content-box' });

    return () => {
      resizeObserver.disconnect();
    };
  }, [euiTheme.breakpoint]);

  return breakpoint;
};

export const useIsWithinChromeApplicationBreakpoints = (
  breakpoints: EuiBreakpointSize[],
  isResponsive = true
): boolean => {
  const currentBreakpoint = useCurrentChromeApplicationBreakpoint();

  return Boolean(currentBreakpoint && isResponsive && breakpoints.includes(currentBreakpoint));
};
