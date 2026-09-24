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
import type { CommentsHostServices } from '@kbn/dev-comments';
import { FormattedRelative } from '@kbn/i18n-react';
import { isSafeRelativePath, routeFromLocation, type CommentRoute } from '../common';
import { createCommentsApi } from './comments_api';
import { captureViewport } from './capture_viewport';

const HOST_IGNORE_SELECTORS = [
  '#developerToolbar',
  '#measureOverlay',
  '#editOverlay',
  '#layoutOverlayContainer',
  '#layoutSettingsFlyout',
  '[data-devtool-resize-handle]',
];

/** `pathname` without the server's base path, which `basePath.remove` would take the space prefix off along with. */
const removeServerBasePath = (pathname: string, { serverBasePath }: IBasePath): string =>
  pathname === serverBasePath
    ? '/'
    : pathname.startsWith(`${serverBasePath}/`)
    ? pathname.slice(serverBasePath.length)
    : pathname;

/**
 * The current page as a comment's route: within this deployment (no origin, no
 * server base path), space prefix included, so that a comment made in one space
 * is not taken for one on the same page of another, and opens in its own.
 */
export const routeOf = (
  { pathname, search, hash }: Pick<Location, 'pathname' | 'search' | 'hash'>,
  basePath: IBasePath
): CommentRoute =>
  routeFromLocation({ pathname: removeServerBasePath(pathname, basePath), search, hash });

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

  // The path has the space in it (see `routeOf`); core reloads the page for a URL out of the current one.
  navigateToPath: async (path) => {
    if (!isSafeRelativePath(path)) {
      throw new Error(`Refusing to navigate outside of this deployment: ${path}`);
    }
    await application.navigateToUrl(`${http.basePath.serverBasePath}${path}`);
  },

  getCurrentUser: async () => {
    const user = await security.authc.getCurrentUser();
    return { username: user.username, fullName: user.full_name ?? undefined };
  },

  captureViewport,

  ignoreSelectors: HOST_IGNORE_SELECTORS,

  // "5 minutes ago" in the UI's locale; the toolbar renders inside core's `I18nProvider`.
  RelativeTime: FormattedRelative,
});
