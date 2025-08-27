/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync, readFileSync } from 'fs';
import { join, sep } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

/**
 * Get the list of codeowners for a given file path by reading the CODEOWNERS file in the repository.
 * It matches the most specific path in the CODEOWNERS file to the given file path.
 * @param {string} path The file path to look up codeowners for, relative to the repository root.
 * @returns {string[]} An array of codeowners responsible for the specified path.
 */
export function getComponentCodeowners(path: string): string[] {
  const codeownersPath = join(REPO_ROOT, '.github', 'CODEOWNERS');
  if (!existsSync(codeownersPath)) {
    return [];
  }

  const normalizedComponentPath = path.split(sep).join('/');

  const codeowners = readFileSync(codeownersPath, 'utf8');
  const lines = codeowners.split('\n');

  const matchingPaths: Array<{ path: string; owners: string[] }> = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine === '' || trimmedLine.startsWith('#')) {
      continue;
    }

    const [pathPattern, ...owners] = trimmedLine.split(/\s+/);

    if (
      normalizedComponentPath === pathPattern ||
      normalizedComponentPath.startsWith(`${pathPattern}/`)
    ) {
      matchingPaths.push({
        path: pathPattern,
        owners,
      });
    }
  }

  if (matchingPaths.length === 0) {
    return [];
  }

  const mostSpecificMatch = matchingPaths.sort((a, b) => b.path.length - a.path.length)[0];

  return mostSpecificMatch.owners;
}
