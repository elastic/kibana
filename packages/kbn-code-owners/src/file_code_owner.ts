/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { createFailError } from '@kbn/dev-cli-errors';
import { join as joinPath } from 'path';
import { existsSync, readFileSync } from 'fs';

import type { Ignore } from 'ignore';
import ignore from 'ignore';

export interface PathWithOwners {
  path: string;
  teams: string;
  ignorePattern: Ignore;
}

/**
 * Get the .github/CODEOWNERS entries, prepared for path matching.
 * The last matching CODEOWNERS entry has highest precedence:
 * https://help.github.com/articles/about-codeowners/
 * so entries are returned in reversed order to later search for the first match.
 */
export function getPathsWithOwnersReversed(): PathWithOwners[] {
  const codeownersPath = joinPath(REPO_ROOT, '.github', 'CODEOWNERS');
  if (existsSync(codeownersPath) === false) {
    throw createFailError(`Unable to determine code owners: file ${codeownersPath} not found`);
  }
  const codeownersContent = readFileSync(codeownersPath, { encoding: 'utf8', flag: 'r' });
  const codeownersLines = codeownersContent.split(/\r?\n/);
  const codeowners = codeownersLines
    .map((line) => line.trim())
    .filter((line) => line && line[0] !== '#');

  const pathsWithOwners: PathWithOwners[] = codeowners.map((c) => {
    const [path, ...ghTeams] = c.split(/\s+/);
    return {
      path,
      teams: ghTeams.map((t) => t.replace('@', '')).join(),
      // register CODEOWNERS entries with the `ignores` lib for later path matching
      ignorePattern: ignore().add([path]),
    };
  });

  return pathsWithOwners.reverse();
}

/**
 * Get the GitHub CODEOWNERS for a file in the repository
 * @param filePath the file to get code owners for
 * @param reversedCodeowners a cached reversed code owners list, use to speed up multiple requests
 */
export function getCodeOwnersForFile(
  filePath: string,
  reversedCodeowners?: PathWithOwners[]
): string | undefined {
  const pathsWithOwners = reversedCodeowners ?? getPathsWithOwnersReversed();

  const match = pathsWithOwners.find((p) => p.ignorePattern.test(filePath).ignored);

  return match?.teams;
}
