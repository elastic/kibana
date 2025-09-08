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

let codeownersContent: string | null = null;
let codeownersLines: string[] | null = null;

const pathLookupCache = new Map<string, string[]>();

/**
 * Load and cache the CODEOWNERS file content in memory.
 */
function loadCodeownersFile(): string[] {
  if (codeownersLines !== null) {
    return codeownersLines;
  }

  const codeownersPath = join(REPO_ROOT, '.github', 'CODEOWNERS');
  if (!existsSync(codeownersPath)) {
    codeownersLines = [];
    return codeownersLines;
  }

  codeownersContent = readFileSync(codeownersPath, 'utf8');
  codeownersLines = codeownersContent.split('\n');
  return codeownersLines;
}

/**
 * Get the list of codeowners for a given file path by reading the CODEOWNERS file in the repository.
 * It matches the most specific path.
 * Uses in-memory caching and memoization for optimal performance.
 * @param {string} path The file path to look up codeowners for, relative to the repository root.
 * @returns {string[]} An array of codeowners responsible for the given path.
 */
export function getComponentCodeowners(path: string): string[] {
  const normalizedComponentPath = path.split(sep).join('/');
  if (pathLookupCache.has(normalizedComponentPath)) {
    return pathLookupCache.get(normalizedComponentPath)!;
  }

  const lines = loadCodeownersFile();

  if (lines.length === 0) {
    pathLookupCache.set(normalizedComponentPath, []);
    return [];
  }

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
    pathLookupCache.set(normalizedComponentPath, []);
    return [];
  }

  const mostSpecificMatch = matchingPaths.sort((a, b) => b.path.length - a.path.length)[0];
  const result = [...mostSpecificMatch.owners];

  pathLookupCache.set(normalizedComponentPath, result);

  return result;
}

/**
 * Clear cache. Mainly for testing purposes.
 */
export function clearCodeownersCache(): void {
  codeownersContent = null;
  codeownersLines = null;
  pathLookupCache.clear();
}
