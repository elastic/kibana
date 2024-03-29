/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DetailViewData } from './types';

export function getNextTab(
  currentTab: DetailViewData | null,
  tabs: DetailViewData[],
  preferredTabs?: string[]
) {
  const firstTab = tabs.length ? tabs[0] : null;
  if (currentTab || !preferredTabs) {
    return firstTab;
  }

  const preferredTabName = preferredTabs.find((tabName) => {
    return tabs.some(({ name }) => tabName.toLowerCase() === name.toLowerCase());
  });
  const preferredTab = preferredTabName
    ? tabs.find(({ name }) => preferredTabName.toLowerCase() === name.toLowerCase())
    : undefined;

  return preferredTab ? preferredTab : firstTab;
}
