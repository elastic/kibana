/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CommentRoute } from '@kbn/dev-comments';
import { isInternalURL } from '@kbn/std';

export const COMMENTS_API_PATH = '/internal/dev_comments';

export type {
  Comment,
  CommentPatch,
  CommentRoute,
  CommentSnapshot,
  CommentsApi,
  NewComment,
  NewSnapshot,
  TrailStep,
} from '@kbn/dev-comments';

/**
 * Whether a path stays within this deployment once the host puts its base path
 * before it: absolute, not something a URL parser turns into another origin or
 * a scheme (`//host`, `/\host`, tabs and newlines it strips before looking
 * again), which is `isInternalURL`'s check for redirect targets, and without
 * dot segments that climb out of the base path (`/../outside`), which it
 * checks against a stand-in one.
 */
export const isSafeRelativePath = (path: string): boolean =>
  path.startsWith('/') &&
  isInternalURL(path) &&
  isInternalURL(`/__dev_comments${path}`, '/__dev_comments');

/**
 * A comment's route from a location whose pathname has had the server's base
 * path removed, and so starts with the space prefix if there is one: the same
 * path in another space is another page, with other content. The page key is
 * the app path plus the hash route of hash-routed apps, without the `_g` / `_a`
 * state that follows `?` in the hash.
 */
export const routeFromLocation = ({
  pathname,
  search,
  hash,
}: {
  pathname: string;
  search: string;
  hash: string;
}): CommentRoute => {
  const hashRoute = hash.split('?')[0];
  return {
    pageKey: `${pathname}${hashRoute === '#' ? '' : hashRoute}`,
    path: `${pathname}${search}${hash}`,
  };
};
