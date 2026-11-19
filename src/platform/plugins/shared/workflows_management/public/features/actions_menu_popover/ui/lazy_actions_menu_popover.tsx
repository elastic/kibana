/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import type { ActionsMenuPopoverProps } from './actions_menu_popover';

/**
 * The actions menu is used by the YAML editor and by the visual editor, which are two separate lazy
 * chunks. Importing it statically from both would put a copy in each (the optimizer only shares a
 * module that 3+ chunks import), so both go through this ONE dynamic `import()` and the menu ships
 * as a single on-demand chunk. Do not import `./actions_menu_popover` or `./actions_menu` as a value
 * from anywhere else.
 */
const loadActionsMenuPopover = () => import('./actions_menu_popover');

const LazyActionsMenuPopover = React.lazy(() =>
  loadActionsMenuPopover().then((module) => ({ default: module.ActionsMenuPopover }))
);

/** Starts fetching the menu chunk. Safe to call any number of times. */
export const preloadActionsMenu = (): Promise<unknown> => loadActionsMenuPopover();

/** Fetches the menu chunk once the browser is idle, so the first open does not wait for it. */
export const useWarmActionsMenu = (): void => {
  useEffect(() => {
    const warm = () => {
      preloadActionsMenu().catch(() => {
        // A failed warm-up is harmless: opening the menu requests the chunk again.
      });
    };
    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(warm, { timeout: 5000 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timeoutId = window.setTimeout(warm, 2000);
    return () => window.clearTimeout(timeoutId);
  }, []);
};

/**
 * Same name and props as the real popover. Renders nothing while closed (as the real one does), so
 * the chunk is requested on the first open at the latest.
 */
export const ActionsMenuPopover = React.memo(function ActionsMenuPopover(
  props: ActionsMenuPopoverProps
) {
  if (!props.isOpen) return null;
  return (
    <React.Suspense fallback={null}>
      <LazyActionsMenuPopover {...props} />
    </React.Suspense>
  );
});
