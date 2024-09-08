/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CONFIG_TAB_ID, HISTORY_TAB_ID, SHELL_TAB_ID } from './constants';

export const loadTabFromURL = (
  routeHash: string | undefined,
  currentTab: string,
  updateTab: (tab: string) => void
) => {
  const routeTab = routeHash?.substring(2); // Remove '#/' from the beginning of the route hash
  if (
    routeTab &&
    routeTab !== currentTab &&
    [SHELL_TAB_ID, CONFIG_TAB_ID, HISTORY_TAB_ID].includes(routeTab)
  ) {
    updateTab(routeTab);
  }
};
