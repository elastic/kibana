/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { useAppMenu, useNextHeader } from '../../../shared/chrome_hooks';

/**
 * Fallback: `config.appMenu` from `chrome.next.header.set()` -> global `chrome.getAppMenu$()`.
 */
export function useAppHeaderMenu(): AppMenuConfig | undefined {
  const config = useNextHeader();
  const globalAppMenu = useAppMenu();
  return config?.appMenu ?? globalAppMenu;
}
