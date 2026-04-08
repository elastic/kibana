/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';

/**
 * Returns the side nav collapsed state and a setter to toggle it.
 * **Internal** — used by `GridLayoutProjectSideNav`.
 */
export function useSideNavCollapsed(): {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
} {
  const chrome = useChromeService();
  const isCollapsed = useObservable(
    chrome.sideNav.getIsCollapsed$(),
    chrome.sideNav.getIsCollapsed()
  );
  return useMemo(
    () => ({ isCollapsed, setIsCollapsed: chrome.sideNav.setIsCollapsed }),
    [isCollapsed, chrome]
  );
}
