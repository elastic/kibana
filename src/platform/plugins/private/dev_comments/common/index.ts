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
 * Whether a path stays within this deployment once the base path is put before
 * it: absolute, no other origin or scheme by any parsing (`isInternalURL`'s
 * check for redirect targets), and no dot segments climbing out of the base
 * path, checked against a stand-in one.
 */
export const isSafeRelativePath = (path: string): boolean =>
  path.startsWith('/') &&
  isInternalURL(path) &&
  isInternalURL(`/__dev_comments${path}`, '/__dev_comments');

/** A comment's route from a location whose pathname starts with the space prefix, if any. The page key is the app path plus the hash route, without the `_g` / `_a` state after `?` in the hash. */
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
