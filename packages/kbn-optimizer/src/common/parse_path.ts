/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import normalizePath from 'normalize-path';
import Qs from 'querystring';

/**
 * Parse an absolute path, supporting normalized paths from webpack,
 * into a list of directories and root
 */
export function parseDirPath(path: string) {
  const filePath = parseFilePath(path);
  return {
    ...filePath,
    dirs: [...filePath.dirs, ...(filePath.filename ? [filePath.filename] : [])],
    filename: undefined,
  };
}

export function parseFilePath(path: string) {
  let normalized = normalizePath(path);
  let query;
  const queryIndex = normalized.indexOf('?');
  if (queryIndex !== -1) {
    query = Qs.parse(normalized.slice(queryIndex + 1));
    normalized = normalized.slice(0, queryIndex);
  }

  const [root, ...others] = normalized.split('/');
  return {
    root: root === '' ? '/' : root,
    dirs: others.slice(0, -1),
    query,
    filename: others[others.length - 1] || undefined,
  };
}
