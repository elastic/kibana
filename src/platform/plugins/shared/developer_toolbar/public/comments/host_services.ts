/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import type { IBasePath } from '@kbn/core-http-browser';
import { isSafeRelativePath, type CommentsHostServices } from '@kbn/dev-comments';
import { routeFromLocation, type CommentRoute } from '../../common/comments';
import { createCommentsApi } from './comments_api';
import { captureViewport } from './capture_viewport';

/** Developer toolbar and `@kbn/design-tools` UI that must never be commented on (mirrors `IGNORED_SELECTOR` in `@kbn/design-tools`). */
const HOST_IGNORE_SELECTORS = [
  '#developerToolbar',
  '#measureOverlay',
  '#editOverlay',
  '#layoutOverlayContainer',
  '#layoutSettingsFlyout',
  '[data-devtool-resize-handle]',
];

/** The current page as a comment's route: within this deployment (no origin, no base path). */
export const routeOf = (
  { pathname, search, hash }: Pick<Location, 'pathname' | 'search' | 'hash'>,
  basePath: IBasePath
): CommentRoute => routeFromLocation({ pathname: basePath.remove(pathname), search, hash });

export const createCommentsHostServices = ({
  http,
  application,
  security,
}: Pick<CoreStart, 'http' | 'application' | 'security'>): CommentsHostServices => ({
  api: createCommentsApi(http),

  location: {
    getPageKey: () => routeOf(window.location, http.basePath).pageKey,
    getPath: () => routeOf(window.location, http.basePath).path,
    subscribe: (listener) => {
      const subscription = application.currentLocation$.subscribe(listener);
      return () => subscription.unsubscribe();
    },
  },

  // Paths come from stored, possibly imported comments: only paths within this
  // deployment are opened, never another origin (`//host`) or scheme.
  navigateToPath: async (path) => {
    if (!isSafeRelativePath(path)) {
      throw new Error(`Refusing to navigate outside of this deployment: ${path}`);
    }
    await application.navigateToUrl(http.basePath.prepend(path));
  },

  getCurrentUser: async () => {
    const user = await security.authc.getCurrentUser();
    return { username: user.username, fullName: user.full_name ?? undefined };
  },

  captureViewport,

  ignoreSelectors: HOST_IGNORE_SELECTORS,
});
