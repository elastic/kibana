/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SidebarStart } from '@kbn/core-chrome-sidebar';
import type { NewsfeedApi } from '../lib/api';
import type { FetchResult } from '../types';

const NEWSFEED_APP_ID = 'newsfeed' as const;

/** Mark items as read then open the newsfeed sidebar app. */
export function openNewsfeedSidebar(
  sidebar: SidebarStart,
  newsfeedApi: NewsfeedApi,
  lastFetchResult: FetchResult | null | void
): void {
  if (lastFetchResult) {
    newsfeedApi.markAsRead(lastFetchResult.feedItems.map((item) => item.hash));
  }
  sidebar.getApp(NEWSFEED_APP_ID).open();
}

/** Toggle the newsfeed sidebar: open if currently not showing it, close if it is. */
export function toggleNewsfeedSidebar(
  sidebar: SidebarStart,
  newsfeedApi: NewsfeedApi,
  lastFetchResult: FetchResult | null | void
): void {
  if (sidebar.getCurrentAppId() === NEWSFEED_APP_ID) {
    sidebar.getApp(NEWSFEED_APP_ID).close();
  } else {
    openNewsfeedSidebar(sidebar, newsfeedApi, lastFetchResult);
  }
}
