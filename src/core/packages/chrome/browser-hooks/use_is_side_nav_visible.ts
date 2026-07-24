/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';

/**
 * Returns `true` when the side navigation is currently visible.
 * Unlike chrome visibility, this only reflects the side nav; the rest of
 * the chrome (e.g. the header) may still be visible when this is `false`.
 */
export function useIsSideNavVisible(): boolean {
  const chrome = useChromeService();
  return useObservable(chrome.sideNav.getIsVisible$(), chrome.sideNav.getIsVisible());
}
