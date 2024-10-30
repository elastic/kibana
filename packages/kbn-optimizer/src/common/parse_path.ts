/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import normalizePath from 'normalize-path';
import Qs from 'querystring';

class ParsedPath {
  constructor(
    public readonly root: string,
    public readonly dirs: string[],
    public readonly query?: Record<string, unknown>,
    public readonly filename?: string
  ) {}

  private indexOfDir(match: string | RegExp, fromIndex: number = 0) {
    for (let i = fromIndex; i < this.dirs.length; i++) {
      if (this.matchDir(i, match)) {
        return i;
      }
    }

    return -1;
  }

  private matchDir(i: number, match: string | RegExp) {
    return typeof match === 'string' ? this.dirs[i] === match : match.test(this.dirs[i]);
  }

  matchDirs(...segments: Array<string | RegExp>) {
    const [first, ...rest] = segments;
    let fromIndex = 0;
    while (true) {
      // do the dirs include the first segment to match?
      const startIndex = this.indexOfDir(first, fromIndex);
      if (startIndex === -1) {
        return;
      }

      // are all of the ...rest segments also matched at this point?
      if (!rest.length || rest.every((seg, i) => this.matchDir(startIndex + 1 + i, seg))) {
        return { startIndex, endIndex: startIndex + rest.length };
      }

      // no match, search again, this time looking at instances after the matched instance
      fromIndex = startIndex + 1;
    }
  }
}

/**
 * Parse an absolute path, supporting normalized paths from webpack,
 * into a list of directories and root
 */
export function parseDirPath(path: string) {
  const filePath = parseFilePath(path);
  return new ParsedPath(
    filePath.root,
    [...filePath.dirs, ...(filePath.filename ? [filePath.filename] : [])],
    filePath.query,
    undefined
  );
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
  return new ParsedPath(
    root === '' ? '/' : root,
    others.slice(0, -1),
    query,
    others[others.length - 1] || undefined
  );
}
