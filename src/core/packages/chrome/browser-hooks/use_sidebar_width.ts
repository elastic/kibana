/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { combineLatest, map } from 'rxjs';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';

/**
 * Returns the effective sidebar pixel width. Returns `0` when the sidebar is
 * closed so callers can use the value directly for layout calculations.
 */
export function useSidebarWidth(): number {
  const chrome = useChromeService();
  const sidebarWidth$ = useMemo(
    () =>
      combineLatest([chrome.sidebar.getWidth$(), chrome.sidebar.isOpen$()]).pipe(
        map(([width, isOpen]) => (isOpen ? width : 0))
      ),
    [chrome]
  );
  const initialWidth = chrome.sidebar.isOpen() ? chrome.sidebar.getWidth() : 0;
  return useObservable(sidebarWidth$, initialWidth);
}
