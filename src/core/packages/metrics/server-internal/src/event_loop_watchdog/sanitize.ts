/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { basename, isAbsolute, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_NAME_LENGTH = 48;
export const MAX_LOCATION_LENGTH = 120;
const ELLIPSIS = '...';

/** Keeps the start of a function name, capped at `MAX_NAME_LENGTH` characters. */
export const capName = (name: string): string => name.slice(0, MAX_NAME_LENGTH);

/** Keeps the end of a location (file name and line), capped at `MAX_LOCATION_LENGTH` characters. */
export const capLocation = (location: string): string =>
  location.length <= MAX_LOCATION_LENGTH
    ? location
    : `${ELLIPSIS}${location.slice(ELLIPSIS.length - MAX_LOCATION_LENGTH)}`;

/** Repo-relative path, `node:` specifier, or the file name for paths outside the repo. */
export const relativeLocation = (url: string, root: string): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('node:')) return url;
  const path = url.startsWith('file://') ? fileURLToPath(url) : url;
  const rel = relative(root, path);
  return rel.startsWith('..') || isAbsolute(rel) ? basename(path) : rel;
};
