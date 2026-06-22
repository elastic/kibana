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
 * Returns whether primary navigation labels are hidden and a setter to toggle them.
 * **Internal** — used by `GridLayoutProjectSideNav`.
 */
export function useSideNavHidePrimaryLabels(): {
  hidePrimaryLabels: boolean;
  setHidePrimaryLabels: (hidePrimaryLabels: boolean) => void;
} {
  const chrome = useChromeService();
  const hidePrimaryLabels = useObservable(
    chrome.sideNav.getHidePrimaryLabels$(),
    chrome.sideNav.getHidePrimaryLabels()
  );
  return useMemo(
    () => ({
      hidePrimaryLabels,
      setHidePrimaryLabels: chrome.sideNav.setHidePrimaryLabels,
    }),
    [hidePrimaryLabels, chrome]
  );
}
