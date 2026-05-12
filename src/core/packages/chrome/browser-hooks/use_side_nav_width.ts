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
 * Returns the effective side nav pixel width.
 */
export function useSideNavWidth(): number {
  const chrome = useChromeService();
  const sideNavWidth$ = useMemo(() => chrome.sideNav.getWidth$(), [chrome]);
  return useObservable(sideNavWidth$, chrome.sideNav.getWidth());
}
