/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppMenuConfigNext } from '@kbn/core-chrome-app-menu-components';
import { useAppMenu } from '../../shared/chrome_hooks';
import { useProjectHeader } from './use_project_header';

/**
 * Returns the app menu config for the Chrome-Next project header.
 * Fallback: `config.appMenu` from `projectHeader.set()` -> global `chrome.getAppMenu$()`.
 */
export function useProjectNextAppMenu(): AppMenuConfigNext | undefined {
  const config = useProjectHeader();
  const globalAppMenu = useAppMenu();
  return config?.appMenu ?? globalAppMenu;
}
