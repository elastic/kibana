/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Any origin does: what matters is whether resolving the path leaves it. */
const ORIGIN = 'https://relative.invalid';

/**
 * True for paths that stay on the host's origin once resolved: a leading `/`
 * and nothing that a URL parser turns into another origin or a scheme, such as
 * `//host/...`, `/\host/...` or the tabs and newlines it strips before looking
 * again. Comments are shared through a store that anyone with access to it
 * can write to, so their paths are checked before use, by the same parser
 * that resolves them.
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
