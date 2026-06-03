/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useLayoutEffect } from 'react';
import { EXPANDED_WIDTH } from '@kbn/ui-side-navigation';

// Thresholds for how wide the main app column is (px). Layout: nav | app | sidebar.
// `window.innerWidth` does not change when the nav collapses, so measuring it does not
// create a feedback loop with auto-collapse.
const APP_COLLAPSE_AT_WIDTH = 1000;
// Slightly larger than APP_COLLAPSE_AT_WIDTH so we do not flip between collapsed and
// expanded on every small resize when the width sits near the boundary.
const APP_EXPAND_AT_WIDTH = 1100;

/**
 * Whether the sidenav should be auto-collapsed for the current window size.
 *
 * Main app width is approximated as viewport width minus expanded nav width and
 * `sidebarWidth`. Below the collapse threshold we collapse; above the expand
 * threshold we expand. Between the two thresholds we leave the nav unchanged so
 * small resizes near the edge do not keep toggling it.
 */
export const useAutoCollapse = (sidebarWidth: number): boolean => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const appWidth = window.innerWidth - EXPANDED_WIDTH - sidebarWidth;
    return appWidth <= APP_COLLAPSE_AT_WIDTH;
  });

  useLayoutEffect(() => {
    const check = () =>
      setIsCollapsed((current) => {
        const appWidth = window.innerWidth - EXPANDED_WIDTH - sidebarWidth;
        if (appWidth <= APP_COLLAPSE_AT_WIDTH) return true;
        if (appWidth >= APP_EXPAND_AT_WIDTH) return false;
        // Between collapse and expand thresholds: keep current state (see constants above).
        return current;
      });

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [sidebarWidth]);

  return isCollapsed;
};
