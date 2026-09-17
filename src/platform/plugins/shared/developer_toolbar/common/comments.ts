/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CommentRoute } from '@kbn/dev-comments';

export const COMMENTS_API_PATH = '/internal/developer_toolbar/comments';

export type {
  Comment,
  CommentPatch,
  CommentRoute,
  CommentSnapshot,
  CommentsApi,
  CommentsExport,
  CommentsImportResult,
  NewComment,
  TrailStep,
} from '@kbn/dev-comments';

/** Any origin does: what matters is whether resolving the path leaves it. */
const ORIGIN = 'https://relative.invalid';

/**
 * Whether a path stays within this deployment once resolved: a leading `/` and
 * nothing that a URL parser turns into another origin or a scheme (`//host`,
 * `/\host`, tabs and newlines it strips before looking again). Same check as
 * `isSafeRelativePath` in `@kbn/dev-comments`, which the server cannot import.
 */
export const isSafeRelativePath = (path: string): boolean => {
  if (!path.startsWith('/')) {
    return false;
  }
  try {
    return new URL(path, ORIGIN).origin === ORIGIN;
  } catch {
    return false;
  }
};

/**
 * A comment's route from a location whose pathname has had the base path (and
 * so the space) removed. The page key is the app path plus the hash route of
 * hash-routed apps, without the `_g` / `_a` state that follows `?` in the hash.
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
