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

// Thresholds for the combined agent + application workspace (px). Layout: nav | agent | app | sidebar.
// `window.innerWidth` does not change when the nav collapses, so measuring it does not
// create a feedback loop with auto-collapse.
const WORKSPACE_COLLAPSE_AT_WIDTH = 1000;
// Slightly larger than WORKSPACE_COLLAPSE_AT_WIDTH so we do not flip between collapsed and
// expanded on every small resize when the width sits near the boundary.
const WORKSPACE_EXPAND_AT_WIDTH = 1100;

const getWorkspaceWidth = (sidebarWidth: number) =>
  window.innerWidth - EXPANDED_WIDTH - sidebarWidth;

/**
 * Whether the sidenav should be auto-collapsed for the current window size.
 *
 * Workspace width is approximated as viewport width minus expanded nav width and
 * `sidebarWidth` (agent + application columns combined). Below the collapse threshold we
 * collapse; above the expand threshold we expand. Between the two thresholds we leave the
 * nav unchanged so small resizes near the edge do not keep toggling it.
 */
export const useAutoCollapse = (sidebarWidth: number): boolean => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const workspaceWidth = getWorkspaceWidth(sidebarWidth);
    return workspaceWidth <= WORKSPACE_COLLAPSE_AT_WIDTH;
  });

  useLayoutEffect(() => {
    const check = () =>
      setIsCollapsed((current) => {
        const workspaceWidth = getWorkspaceWidth(sidebarWidth);
        if (workspaceWidth <= WORKSPACE_COLLAPSE_AT_WIDTH) return true;
        if (workspaceWidth >= WORKSPACE_EXPAND_AT_WIDTH) return false;
        // Between collapse and expand thresholds: keep current state (see constants above).
        return current;
      });

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [sidebarWidth]);

  return isCollapsed;
};
