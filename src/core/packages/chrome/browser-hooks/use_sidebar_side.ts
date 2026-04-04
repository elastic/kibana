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
import type { SidebarSide } from '@kbn/core-chrome-sidebar';

/**
 * Returns the current sidebar side ('left' | 'right').
 */
export function useSidebarSide(): SidebarSide {
  const chrome = useChromeService();
  return useObservable(chrome.sidebar.getSidebarSide$(), chrome.sidebar.getSidebarSide());
}
