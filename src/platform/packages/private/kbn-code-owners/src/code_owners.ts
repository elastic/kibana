/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import fs from 'node:fs';
import path from 'node:path';

import ignore, { Ignore } from 'ignore';
import { CODE_OWNERS_FILE, throwIfPathIsMissing, throwIfPathNotInRepo } from './path';
import { CodeOwnerArea, findAreaForCodeOwner } from './code_owner_areas';

export interface CodeOwnersEntry {
  pattern: string;
  matcher: Ignore;
  teams: string[];
  areas: CodeOwnerArea[];
  comment?: string;
}

/**
 * Generator function that yields lines from the CODEOWNERS file
 */
export function* getCodeOwnersLines(): Generator<string> {
  const codeOwnerLines = fs
    .readFileSync(CODE_OWNERS_FILE, { encoding: 'utf8', flag: 'r' })
    .split(/\r?\n/);

  for (const line of codeOwnerLines) {
    // Empty line
    if (line.length === 0) continue;

    // Comment
    if (line.startsWith('#')) continue;

    // Assignment override on backport branches to avoid review requests
    if (line.includes('@kibanamachine')) continue;

    yield line.trim();
  }
}

/**
 * Get all code owner entries from the CODEOWNERS file
 *
 * Entries are ordered in reverse relative to how they're defined in the CODEOWNERS file
 * as patterns defined lower in the CODEOWNERS file can override earlier entries.
 */
export function getCodeOwnersEntries(): CodeOwnersEntry[] {
  const entries: CodeOwnersEntry[] = [];

  for (const line of getCodeOwnersLines()) {
    const comment = line
      .match(/#(.+)$/)
      ?.at(1)
      ?.trim();

    const [rawPathPattern, ...rawTeams] = line
      .replace(/#.+$/, '') // drop comment
      .split(/\s+/);

    const pathPattern = rawPathPattern.replace(/\/$/, '');

    const teams = rawTeams.map((team) => team.replace('@', '')).filter((team) => team.length > 0);
    const areas: CodeOwnerArea[] = [];

    for (const team of teams) {
      const area = findAreaForCodeOwner(team);
      if (area === undefined || areas.includes(area)) continue;
      areas.push(area);
    }

    entries.push({
      pattern: pathPattern,
      teams,
      areas,
      comment,

      // Register code owner entry with the `ignores` lib for easy pattern matching later on
      matcher: ignore().add(pathPattern),
    });
  }

  // Reverse entry order as patterns defined lower in the CODEOWNERS file can override earlier entries
  entries.reverse();

  return entries;
}

/**
 * Get a list of matching code owners for a given path
 *
 * Tip:
 *   If you're making a lot of calls to this function, fetch the code owner paths once using
 *   `getCodeOwnersEntries` and pass it in the `getCodeOwnersEntries` parameter to speed up your queries.
 *
 * @param searchPath The path to find code owners for
 * @param codeOwnersEntries Pre-defined list of code owner paths to search in
 *
 * @returns Code owners entry if a match is found.
 * @throws Error if `searchPath` does not exist or is not part of this repository
 */
export function findCodeOwnersEntryForPath(
  searchPath: string,
  codeOwnersEntries?: CodeOwnersEntry[]
): CodeOwnersEntry | undefined {
  throwIfPathIsMissing(CODE_OWNERS_FILE, 'Code owners file');
  throwIfPathNotInRepo(searchPath);
  const searchPathRelativeToRepo = path.relative(REPO_ROOT, searchPath);

  return (codeOwnersEntries || getCodeOwnersEntries()).find(
    (p) => p.matcher.test(searchPathRelativeToRepo).ignored
  );
}

/**
 * Get a list of matching code owners for a given path
 *
 * Tip:
 *   If you're making a lot of calls to this function, fetch the code owner paths once using
 *   `getCodeOwnersEntries` and pass it in the `getCodeOwnersEntries` parameter to speed up your queries.
 *
 * @param searchPath The path to find code owners for
 * @param codeOwnersEntries Pre-defined list of code owner entries
 *
 * @returns List of code owners for the given path. Empty list if no matching entry is found.
 * @throws Error if `searchPath` does not exist or is not part of this repository
 */
export function getOwningTeamsForPath(
  searchPath: string,
  codeOwnersEntries?: CodeOwnersEntry[]
): string[] {
  return findCodeOwnersEntryForPath(searchPath, codeOwnersEntries)?.teams || [];
}
