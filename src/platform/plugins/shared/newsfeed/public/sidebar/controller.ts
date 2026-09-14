/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { SidebarStart } from '@kbn/core-chrome-sidebar';
import type { NewsfeedApi } from '../lib/api';
import type { FetchResult } from '../types';

const NEWSFEED_APP_ID = 'newsfeed' as const;

/**
 * Everything the newsfeed UI needs to drive the sidebar, with the sidebar itself hidden behind
 * it. Consumers work in terms of "is the newsfeed showing" and "toggle it", not app ids.
 */
export interface NewsfeedSidebarController {
  /** Emits true while the newsfeed is the app currently shown in the sidebar. */
  isOpen$: Observable<boolean>;
  /** Mark the current items as read, then show the newsfeed. */
  open: () => void;
  /** Show the newsfeed, or hide it if it is already showing. */
  toggle: () => void;
}

/**
 * Owns every interaction with the chrome sidebar, so the rest of the plugin never references the
 * sidebar app id or its contract.
 */
export function createNewsfeedSidebarController({
  sidebar,
  newsfeedApi,
}: {
  sidebar: SidebarStart;
  newsfeedApi: NewsfeedApi;
}): NewsfeedSidebarController {
  const app = sidebar.getApp(NEWSFEED_APP_ID);

  // Opening marks whatever is currently in the feed as read, so the latest result is tracked here.
  // The stream completes when the plugin stops, which tears this subscription down with it.
  let lastFetchResult: FetchResult | null | void = null;
  newsfeedApi.fetchResults$.subscribe((result) => {
    lastFetchResult = result;
  });

  const open = () => {
    if (lastFetchResult) {
      newsfeedApi.markAsRead(lastFetchResult.feedItems.map((item) => item.hash));
    }
    app.open();
  };

  return {
    isOpen$: app.isOpen$(),
    open,
    toggle: () => {
      if (app.isOpen()) {
        app.close();
      } else {
        open();
      }
    },
  };
}
