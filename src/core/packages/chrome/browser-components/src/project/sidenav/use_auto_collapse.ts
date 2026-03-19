/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useLayoutEffect } from 'react';
import { EXPANDED_WIDTH } from '@kbn/core-chrome-navigation';

// Target app content area thresholds (in px).
// The grid is: nav | 1fr (app) | sidebar. window.innerWidth is stable and
// never changes as a side effect of the nav collapsing, so no feedback loop.
const APP_COLLAPSE_AT_WIDTH = 1000;
const APP_EXPAND_AT_WIDTH = 1100;

/**
 * Returns whether the sidenav should be auto-collapsed based on the current
 * viewport width and sidebar width. Collapses when the app content area would
 * be too narrow for a comfortably expanded nav.
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
        return current; // stay in current state within the hysteresis zone
      });

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [sidebarWidth]);

  return isCollapsed;
};
