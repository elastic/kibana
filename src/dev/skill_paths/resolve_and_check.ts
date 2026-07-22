/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync } from 'fs';
import * as path from 'path';

export interface ResolveOptions {
  token: string;
  anchor: 'repo-root' | 'file' | 'declared-base';
  containingFile: string;
  repoRoot: string;
  declaredBase?: string;
}

export interface ResolveResult {
  exists: boolean;
  resolvedPath: string;
}

/**
 * Resolve a token to an absolute path and check whether it exists on disk.
 * Accepts files and directories (tokens ending in `/`).
 */
export function resolveAndCheck(options: ResolveOptions): ResolveResult {
  const { token, anchor, containingFile, repoRoot, declaredBase } = options;

  let resolvedPath: string;

  switch (anchor) {
    case 'repo-root':
      resolvedPath = path.resolve(repoRoot, token);
      break;
    case 'file':
      resolvedPath = path.resolve(path.dirname(containingFile), token);
      break;
    case 'declared-base':
      if (!declaredBase) {
        throw new Error(`anchor is 'declared-base' but no declaredBase was provided`);
      }
      resolvedPath = path.resolve(repoRoot, declaredBase, token);
      break;
  }

  return { exists: existsSync(resolvedPath), resolvedPath };
}
